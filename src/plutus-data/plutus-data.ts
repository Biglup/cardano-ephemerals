/**
 * Copyright 2023 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { CborReader, CborReaderState, CborTag, CborWriter } from '@cardano-sdk/core';
import { ConstrPlutusData, PlutusDataKind, PlutusList, PlutusMap } from './';
import { HexBlob } from '@cardano-sdk/util';

const MAX_WORD64 = 18_446_744_073_709_551_615n;
const INDEFINITE_BYTE_STRING = new Uint8Array([95]);
const MAX_BYTE_STRING_CHUNK_SIZE = 64;

/**
 * A type corresponding to the Plutus Core Data datatype.
 *
 * The point of this type is to be opaque as to ensure that it is only used in ways
 * that plutus scripts can handle.
 *
 * Use this type to build any data structures that you want to be representable on-chain.
 */
export class PlutusData {
  private _map: PlutusMap | undefined = undefined;
  private _list: PlutusList | undefined = undefined;
  private _integer: bigint | undefined = undefined;
  private _bytes: Uint8Array | undefined = undefined;
  private _constr: ConstrPlutusData | undefined = undefined;
  private _kind: PlutusDataKind = PlutusDataKind.ConstrPlutusData;
  // private _originalBytes: Uint8Array | undefined = undefined;

  /**
   * Serializes this PlutusData instance into its CBOR representation as a Uint8Array.
   *
   * @return The CBOR representation of this instance as a Uint8Array.
   */
  // eslint-disable-next-line complexity
  toBytes(): Uint8Array {
    // if (this._originalBytes) return this._originalBytes;

    let bytes: Uint8Array;

    switch (this._kind) {
      case PlutusDataKind.ConstrPlutusData: {
        bytes = this._constr!.toBytes();
        break;
      }
      case PlutusDataKind.Map: {
        bytes = this._map!.toBytes();
        break;
      }
      case PlutusDataKind.List: {
        bytes = this._list!.toBytes();
        break;
      }
      // Note [The 64-byte limit]: See https://github.com/input-output-hk/plutus/blob/1f31e640e8a258185db01fa899da63f9018c0e85/plutus-core/plutus-core/src/PlutusCore/Data.hs#L61-L105
      // If the bytestring is >64bytes, we encode it as indefinite-length bytestrings with 64-byte chunks. We have to write
      // our own encoders/decoders so we can produce chunks of the right size and check
      // the sizes when we decode.
      case PlutusDataKind.Bytes: {
        const writer = new CborWriter();

        if (this._bytes!.length <= MAX_BYTE_STRING_CHUNK_SIZE) {
          writer.writeByteString(this._bytes!);
        } else {
          writer.writeEncodedValue(INDEFINITE_BYTE_STRING);

          for (let i = 0; i < this._bytes!.length; i += MAX_BYTE_STRING_CHUNK_SIZE) {
            const chunk = this._bytes!.slice(i, i + MAX_BYTE_STRING_CHUNK_SIZE);
            writer.writeByteString(chunk);
          }

          writer.writeEndArray();
        }

        bytes = writer.encode();
        break;
      }
      // For integers, we have two cases. Small integers (<64bits) can be encoded normally. Big integers are already
      // encoded *with a byte string*. The spec allows this to be an indefinite-length bytestring. Again, we need to
      // write some manual encoders/decoders.
      case PlutusDataKind.Integer: {
        const writer = new CborWriter();
        // If it fits in a Word64, then it's less than 64 bits for sure, and we can just send it off
        // as a normal integer.
        if (
          (this._integer! >= 0 && this._integer! <= MAX_WORD64) ||
          (this._integer! < 0 && this._integer! >= -1n - MAX_WORD64)
        ) {
          writer.writeInt(this._integer!);
        } else {
          // Otherwise, it would be encoded as a bignum anyway, so we manually do the bignum
          // encoding with a bytestring inside.
          writer.writeBigInteger(this._integer!);
        }

        bytes = writer.encode();
        break;
      }
      default:
        throw new Error('Unsupported PlutusData kind');
    }

    return bytes;
  }

  /**
   * Deserializes a PlutusData instance from its CBOR representation.
   *
   * @param cbor The CBOR representation of this instance as a Uint8Array.
   *
   * @return A PlutusData instance.
   */
  // eslint-disable-next-line max-statements
  static fromBytes(cbor: Uint8Array): PlutusData {
    const data = new PlutusData();
    const reader = new CborReader(HexBlob.fromBytes(cbor));

    const peekTokenType = reader.peekState();

    switch (peekTokenType) {
      case CborReaderState.Tag: {
        const tag = reader.peekTag();

        // eslint-disable-next-line sonarjs/no-nested-switch
        switch (tag) {
          case CborTag.UnsignedBigNum: {
            reader.readTag();
            const bytes = reader.readByteString();
            data._integer = PlutusData.bufferToBigint(bytes);
            data._kind = PlutusDataKind.Integer;
            break;
          }
          case CborTag.NegativeBigNum: {
            reader.readTag();
            const bytes = reader.readByteString();
            data._integer = PlutusData.bufferToBigint(bytes) * -1n;
            data._kind = PlutusDataKind.Integer;
            break;
          }
          default: {
            data._constr = ConstrPlutusData.fromBytes(reader.readEncodedValue());
            data._kind = PlutusDataKind.ConstrPlutusData;
          }
        }
        break;
      }
      case CborReaderState.NegativeInteger:
      case CborReaderState.UnsignedInteger: {
        data._integer = reader.readInt();
        data._kind = PlutusDataKind.Integer;
        break;
      }
      case CborReaderState.StartIndefiniteLengthByteString:
      case CborReaderState.ByteString: {
        data._bytes = reader.readByteString();
        data._kind = PlutusDataKind.Bytes;
        break;
      }
      case CborReaderState.StartArray: {
        data._list = PlutusList.fromBytes(reader.readEncodedValue());
        data._kind = PlutusDataKind.List;
        break;
      }
      case CborReaderState.StartMap: {
        data._map = PlutusMap.fromBytes(reader.readEncodedValue());
        data._kind = PlutusDataKind.Map;
        break;
      }
      default: {
        throw new Error('Invalid Plutus Data');
      }
    }

    return data;
  }

  /**
   * Create a PlutusData type from the given ConstrPlutusData.
   *
   * @param constrPlutusData The ConstrPlutusData to be 'cast' as PlutusData.
   *
   * @return The ConstrPlutusData as a PlutusData object.
   */
  static newConstrPlutusData(constrPlutusData: ConstrPlutusData): PlutusData {
    const data = new PlutusData();

    data._constr = constrPlutusData;
    data._kind = PlutusDataKind.ConstrPlutusData;

    return data;
  }

  /**
   * Create a PlutusData type from the given PlutusMap.
   *
   * @param map The PlutusMap to be 'cast' as PlutusData.
   *
   * @return The PlutusMap as a PlutusData object.
   */
  static newMap(map: PlutusMap): PlutusData {
    const data = new PlutusData();

    data._map = map;
    data._kind = PlutusDataKind.Map;

    return data;
  }

  /**
   * Create a PlutusData type from the given PlutusList.
   *
   * @param list The PlutusList to be 'cast' as PlutusData.
   *
   * @return The PlutusMap as a PlutusList object.
   */
  static newList(list: PlutusList): PlutusData {
    const data = new PlutusData();

    data._list = list;
    data._kind = PlutusDataKind.List;

    return data;
  }

  /**
   * Create a PlutusData type from the given bigint.
   *
   * @param integer The bigint to be 'cast' as PlutusData.
   *
   * @return The bigint as a PlutusList object.
   */
  static newInteger(integer: bigint): PlutusData {
    const data = new PlutusData();

    data._integer = integer;
    data._kind = PlutusDataKind.Integer;

    return data;
  }

  /**
   * Create a PlutusData type from the given Uint8Array.
   *
   * @param bytes The Uint8Array to be 'cast' as PlutusData.
   *
   * @return The Uint8Array as a PlutusList object.
   */
  static newBytes(bytes: Uint8Array): PlutusData {
    const data = new PlutusData();

    data._bytes = bytes;
    data._kind = PlutusDataKind.Bytes;

    return data;
  }

  /**
   * Gets the underlying type of this PlutusData instance.
   *
   * @return The underlying type.
   */
  getKind(): PlutusDataKind {
    return this._kind;
  }

  /**
   * Down casts this PlutusData instance as a ConstrPlutusData instance.
   *
   * @return The ConstrPlutusData instance or undefined if it can not be 'down cast'.
   */
  asConstrPlutusData(): ConstrPlutusData | undefined {
    return this._constr;
  }

  /**
   * Down casts this PlutusData instance as a PlutusMap instance.
   *
   * @return The PlutusMap instance or undefined if it can not be 'down cast'.
   */
  asMap(): PlutusMap | undefined {
    return this._map;
  }

  /**
   * Down casts this PlutusData instance as a PlutusList instance.
   *
   * @return The PlutusList instance or undefined if it can not be 'down cast'.
   */
  asList(): PlutusList | undefined {
    return this._list;
  }

  /**
   * Down casts this PlutusData instance as a bigint instance.
   *
   * @return The bigint value or undefined if it can not be 'down cast'.
   */
  asInteger(): bigint | undefined {
    return this._integer;
  }

  /**
   * Down casts this PlutusData instance as a Uint8Array instance.
   *
   * @return The Uint8Array or undefined if it can not be 'down cast'.
   */
  asBoundedBytes(): Uint8Array | undefined {
    return this._bytes;
  }

  /**
   * Converts an Uint8Array to a bigint.
   *
   * @param buffer The buffer to be converted to bigint.
   *
   * @returns The resulting bigint;
   */
  private static bufferToBigint(buffer: Uint8Array): bigint {
    let ret = 0n;
    for (const i of buffer.values()) {
      const bi = BigInt(i);
      // eslint-disable-next-line no-bitwise
      ret = (ret << 8n) + bi;
    }
    return ret;
  }
}

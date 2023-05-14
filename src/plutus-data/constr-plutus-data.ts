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

import { CborReader, CborWriter } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import { PlutusList } from './';

const GENERAL_FORM_TAG = 102n;
const ALTERNATIVE_TAG_OFFSET = 7n;

/**
 * The main datatype `Constr` represents the nth constructor
 * along with its arguments.
 *
 * Remark: We don't directly serialize the alternative in the tag,
 * instead the scheme is:
 *
 * - Alternatives 0-6 -> tags 121-127, followed by the arguments in a list.
 * - Alternatives 7-127 -> tags 1280-1400, followed by the arguments in a list.
 * - Any alternatives, including those that don't fit in the above -> tag 102 followed by a list containing
 * an unsigned integer for the actual alternative, and then the arguments in a (nested!) list.
 */
export class ConstrPlutusData {
  private readonly _alternative: bigint = 0n;
  private readonly _data = new PlutusList();

  /**
   * Initializes a new instance of the ConstrPlutusData class.
   *
   * @param alternative Get the Constr alternative. The alternative represents the nth
   * constructor of a 'Sum Type'.
   * @param data Gets the list of arguments of the 'Sum Type' as a 'PlutusList'.
   */
  constructor(alternative: bigint, data: PlutusList) {
    this._alternative = alternative;
    this._data = data;
  }

  /**
   * Serializes this ConstrPlutusData instance into its CBOR representation as a Uint8Array.
   *
   * @return The CBOR representation of this instance as a Uint8Array.
   */
  toBytes(): Uint8Array {
    const writer = new CborWriter();
    const compactTag = ConstrPlutusData.alternativeToCompactCborTag(this._alternative);

    writer.writeTag(Number(compactTag));

    if (compactTag === GENERAL_FORM_TAG) {
      writer.writeEncodedValue(this._data.toBytes());
    } else {
      writer.writeStartArray(2);
      writer.writeInt(this._alternative);
      writer.writeEncodedValue(this._data.toBytes());
    }

    return writer.encode();
  }

  /**
   * Deserializes a ConstrPlutusData instance from its CBOR representation.
   *
   * @param cbor The CBOR representation of this instance as a Uint8Array.
   *
   * @return A ConstrPlutusData instance.
   */
  static fromBytes(cbor: Uint8Array): ConstrPlutusData {
    const reader = new CborReader(HexBlob.fromBytes(cbor));

    const tag = reader.readTag();

    if (tag === Number(GENERAL_FORM_TAG)) {
      reader.readStartArray();

      const alternative = reader.readInt();
      const data = reader.readEncodedValue();
      const plutusList = PlutusList.fromBytes(data);

      reader.readEndArray();

      return new ConstrPlutusData(alternative, plutusList);
    }

    const alternative = ConstrPlutusData.compactCborTagToAlternative(BigInt(tag));
    const data = reader.readEncodedValue();
    const plutusList = PlutusList.fromBytes(data);

    return new ConstrPlutusData(alternative, plutusList);
  }

  /**
   * Gets the ConstrPlutusData alternative. The alternative represents the nth
   * constructor of a 'Sum Type'.
   *
   * @return The alternative constructor of the 'Sum Type'.
   */
  getAlternative(): bigint {
    return this._alternative;
  }

  /**
   * The list of arguments of the 'Sum Type' as a 'PlutusList'.
   *
   * @return The list of arguments.
   */
  getData(): PlutusList {
    return this._data;
  }

  // Mapping functions to and from alternative to and from CBOR tags.
  // See https://github.com/input-output-hk/plutus/blob/1f31e640e8a258185db01fa899da63f9018c0e85/plutus-core/plutus-core/src/PlutusCore/Data.hs#L69-L72

  /**
   * Converts a CBOR compact tag to a Constr alternative.
   *
   * @param tag The tag to be converted.
   *
   * @return The Constr alternative.
   */
  private static compactCborTagToAlternative(tag: bigint): bigint {
    if (tag >= 121n && tag <= 127) return tag - 121n;
    if (tag >= 1280n && tag <= 1400) return tag - 1280n + ALTERNATIVE_TAG_OFFSET;

    return GENERAL_FORM_TAG;
  }

  /**
   * Converts the constructor alternative to its CBOR compact tag.
   *
   * @param alternative The Constr alternative to be converted.
   *
   * @return The compact CBOR tag.
   */
  private static alternativeToCompactCborTag(alternative: bigint): bigint {
    if (alternative <= 6n) return 121n + alternative;
    if (alternative >= 7n && alternative <= 127n) return 1280n - ALTERNATIVE_TAG_OFFSET + alternative;

    return GENERAL_FORM_TAG;
  }
}

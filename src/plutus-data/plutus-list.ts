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

import { CborReader, CborReaderState, CborWriter } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import { PlutusData } from './';

/**
 * A list of plutus data.
 */
export class PlutusList {
  private readonly _array = new Array<PlutusData>();
  private _useIndefiniteEncoding = false;

  /**
   * Serializes this PlutusList instance into its CBOR representation as a Uint8Array.
   *
   * @return The CBOR representation of this instance as a Uint8Array.
   */
  toBytes(): Uint8Array {
    const writer = new CborWriter();

    if (this._useIndefiniteEncoding) {
      writer.writeStartArray();
    } else {
      writer.writeStartArray(this._array.length);
    }

    for (const elem of this._array) {
      writer.writeEncodedValue(elem.toBytes());
    }

    if (this._useIndefiniteEncoding) writer.writeEndArray();

    return writer.encode();
  }

  /**
   * Deserializes a PlutusList instance from its CBOR representation.
   *
   * @param cbor The CBOR representation of this instance as a Uint8Array.
   *
   * @return A PlutusList instance.
   */
  static fromBytes(cbor: Uint8Array): PlutusList {
    const list = new PlutusList();
    const reader = new CborReader(HexBlob.fromBytes(cbor));

    const length = reader.readStartArray();

    if (length === null) list._useIndefiniteEncoding = true;

    while (reader.peekState() !== CborReaderState.EndArray) {
      list.add(PlutusData.fromBytes(reader.readEncodedValue()));
    }

    reader.readEndArray();

    return list;
  }

  /**
   * Gets the length of the list.
   *
   * @return the length of the list.
   */
  getLength(): number {
    return this._array.length;
  }

  /**
   * Gets an element from the list.
   *
   * @param index The index in the list of the element to get.
   */
  get(index: number): PlutusData {
    return this._array[index];
  }

  /**
   * Adds an element to the Plutus List.
   *
   * @param elem The element to be added.
   */
  add(elem: PlutusData): void {
    this._array.push(elem);
  }
}

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
import { PlutusData, PlutusList } from './';

/**
 * Represents a Map of Plutus data.
 */
export class PlutusMap {
  private readonly _map = new Map<PlutusData, PlutusData>();
  private _useIndefiniteEncoding = false;

  /**
   * Serializes this PlutusMap instance into its CBOR representation as a Uint8Array.
   *
   * @return The CBOR representation of this instance as a Uint8Array.
   */
  toBytes(): Uint8Array {
    const writer = new CborWriter();

    if (this._useIndefiniteEncoding) {
      writer.writeStartMap();
    } else {
      writer.writeStartMap(this._map.size);
    }

    for (const [key, value] of this._map.entries()) {
      writer.writeEncodedValue(key.toBytes());
      writer.writeEncodedValue(value.toBytes());
    }

    if (this._useIndefiniteEncoding) writer.writeEndMap();

    return writer.encode();
  }

  /**
   * Deserializes a PlutusMap instance from its CBOR representation.
   *
   * @param cbor The CBOR representation of this instance as a Uint8Array.
   *
   * @return A PlutusMap instance.
   */
  static fromBytes(cbor: Uint8Array): PlutusMap {
    const map = new PlutusMap();
    const reader = new CborReader(HexBlob.fromBytes(cbor));

    const size = reader.readStartMap();

    if (size === null) map._useIndefiniteEncoding = true;

    while (reader.peekState() !== CborReaderState.EndMap) {
      const key = PlutusData.fromBytes(reader.readEncodedValue());
      const value = PlutusData.fromBytes(reader.readEncodedValue());

      map.insert(key, value);
    }

    reader.readEndMap();

    return map;
  }

  /**
   * Gets the length of the map.
   *
   * @return the length of the map.
   */
  getLength(): number {
    return this._map.size;
  }

  /**
   * Adds an element to the map.
   *
   * @param key The key of the element in the map.
   * @param value The value of the element.
   */
  insert(key: PlutusData, value: PlutusData) {
    this._map.set(key, value);
  }

  /**
   * Returns the specified element from the map.
   *
   * @param key The key of the element to return from the map.
   *
   * @return The element associated with the specified key in the map, or undefined
   * if there is no element with the given key.
   */
  get(key: PlutusData): PlutusData | undefined {
    return this._map.get(key);
  }

  /**
   * Gets all the keys from the map as a plutus list.
   *
   * @returns The keys of the map as a plutus list.
   */
  getKeys(): PlutusList {
    const list = new PlutusList();

    for (const elem of this._map.keys()) {
      list.add(elem);
    }

    return list;
  }
}

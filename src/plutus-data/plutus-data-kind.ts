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

/**
 * The plutus data type kind.
 */
export enum PlutusDataKind {
  /**
   * Represents a specific constructor of a 'Sum Type' along with its arguments.
   */
  ConstrPlutusData,

  /**
   * A map of PlutusData as both key and values.
   */
  Map,

  /**
   * A list of PlutusData.
   */
  List,

  /**
   * An integer.
   */
  Integer,

  /**
   * Bounded bytes.
   */
  Bytes
}

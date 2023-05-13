import { PlutusData } from './plutus-data';
import { PlutusList } from './plutus-list';

export class PlutusMap {
  toBytes(): Uint8Array;
  static fromBytes(bytes: Uint8Array): PlutusMap;
  static new(): PlutusMap;
  len(): number;
  insert(key: PlutusData, value: PlutusData): PlutusData | undefined;
  get(key: PlutusData): PlutusData | undefined;
  keys(): PlutusList;
}

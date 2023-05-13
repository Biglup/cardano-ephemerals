import { PlutusData } from './';

export class PlutusList {
  toBytes(): Uint8Array;
  static fromBytes(bytes: Uint8Array): PlutusList;
  static new(): PlutusList;
  len(): number;
  get(index: number): PlutusData;
  add(elem: PlutusData): void;
}

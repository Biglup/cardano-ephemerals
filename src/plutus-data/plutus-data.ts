import { ConstrPlutusData, PlutusDataKind, PlutusList, PlutusMap } from './';

export class PlutusData {
  toBytes(): Uint8Array;
  static fromBytes(bytes: Uint8Array): PlutusData;
  static newConstrPlutusData(constr_plutus_data: ConstrPlutusData): PlutusData;
  static newMap(map: PlutusMap): PlutusData;
  static newList(list: PlutusList): PlutusData;
  static newInteger(integer: BigInt): PlutusData;
  static newBytes(bytes: Uint8Array): PlutusData;
  kind(): PlutusDataKind;
  asConstrPlutusData(): ConstrPlutusData | undefined;
  asMap(): PlutusMap | undefined;
  asList(): PlutusList | undefined;
  asInteger(): BigInt | undefined;
  asBytes(): Uint8Array | undefined;
}

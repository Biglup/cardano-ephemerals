import { PlutusList } from './';

export class ConstrPlutusData {
  private readonly _alternative: bigint = 0n;
  private readonly _data = new PlutusList();

  constructor(alternative: bigint, data: PlutusList) {
    this._alternative = alternative;
    this._data = data;
  }

  toBytes(): Uint8Array {
    throw new Error('Not Implemented');
  }

  static fromBytes(_: Uint8Array): ConstrPlutusData {
    throw new Error('Not Implemented');
  }

  alternative(): bigint {
    return this._alternative;
  }

  data(): PlutusList {
    return this._data;
  }
}

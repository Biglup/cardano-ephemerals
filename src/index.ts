import { CborReader, CborReaderState } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';

export const a = () => {
  const reader: CborReader = new CborReader(HexBlob('a0'));
  return reader.peekState() === CborReaderState.StartMap;
};

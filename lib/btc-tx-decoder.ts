import {
  Transaction as BTCTransaction,
  TxOutput,
  TxInput,
  address,
  networks,
  script
} from 'bitcoinjs-lib';
import BigNumber from 'bignumber.js';
import { BitcoreTransaction } from './bitcore-db/queries';
import { fetchRawTxInfo } from './client/core-api';
import { btcValueUnsafe } from './utils';

export const getAddr = (txOutScript: Buffer) => {
  let addr: string | null = null;
  try {
    addr = address.fromOutputScript(txOutScript, networks.bitcoin);
    return addr;
  } catch (error) {
    // nothing
  }
  return addr;
};

export type RawTxInput = {
  txid: string;
  index: number;
  sequence: number;
  addr: string;
  script?: string;
  inputTx?: BTCTransaction;
};

export type FormattedTxOutput = {
  satoshi: number;
  value: number;
  n: number;
  scriptPubKey: {
    asm: string;
    hex: string;
    addresses: string[];
  };
  addr: string;
};

export type DecodeTxResult = BitcoreTransaction & {
  version: number;
  locktime: number;
  ins: TxInput[];
  outs: Partial<TxOutput>[];
  
  vin: RawTxInput[];
  vout: FormattedTxOutput[];

  blockheight: number;
  value: number;
  valueOut: number;
};

export const decodeTx = async (
  tx: BTCTransaction,
  networkData: BitcoreTransaction
): Promise<DecodeTxResult> => {
  const fetchVins: Promise<RawTxInput>[] = tx.ins.map(
    async (input, index) => {
      const txid = input.hash.reverse().toString('hex');
      try {
        const inputTxHash = await fetchRawTxInfo(txid);
        const inputTx = BTCTransaction.fromHex(inputTxHash);
        return {
          txid,
          index: input.index,
          script: script.toASM(input.script),
          sequence: input.sequence,
          addr: getAddr(inputTx.outs[input.index].script),
          inputTx
        };
      } catch (error) {
        return {
          txid,
          index: input.index,
          addr: '',
          // script: input.script ? script.toASM(input.script) : null,
          sequence: input.sequence
        };
      }
    }
  )
  let vin: RawTxInput[] = [];
  try {
    vin = await Promise.all(fetchVins);
  } catch (error) {
    console.error('error fetching vins', error);
  }

  const format = (out: TxOutput, n: number): FormattedTxOutput => {
    const vout = {
      satoshi: out.value,
      value: btcValueUnsafe(out.value),
      n,
      scriptPubKey: {
        asm: script.toASM(out.script),
        hex: out.script.toString('hex'),
        addresses: [] as string[]
      },
      addr: getAddr(out.script)
    };
    return vout;
  };

  const vout: FormattedTxOutput[] = tx.outs.map((out, n) => format(out, n));
  
  const value = btcValueUnsafe(networkData.value);

  const decodedTx: DecodeTxResult = {
    ...tx,
    vin,
    vout,
    blockheight: networkData.blockHeight,
    ...networkData,
    value,
    valueOut: value
  };

  return decodedTx;
};

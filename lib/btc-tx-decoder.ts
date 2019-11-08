import {
  Transaction as BTCTransaction,
  TxOutput,
  address,
  networks,
  script
} from 'bitcoinjs-lib';
import { Transaction } from './bitcore-db/queries';
import { fetchRawTxInfo } from './client/core-api';

const getAddr = (out: TxOutput) => {
  let addr: string | null = null;
  try {
    addr = address.fromOutputScript(out.script, networks.bitcoin);
  } catch (error) {
    // nothing
  }
  return addr;
};

interface Output {
  addr: string
  value: number
  [key: string]: any
}

interface Input {
  addr: string
  txid: string
  [key: string]: any
}

export const decodeTx = async (
  tx: BTCTransaction,
  networkData: Transaction
) => {
  const fetchVins: Promise<Input>[] = tx.ins.map(
    async (input, index) => {
      const txid = input.hash.reverse().toString('hex');
      try {
        const inputTxHash = await fetchRawTxInfo(txid);
        const inputTx = BTCTransaction.fromHex(inputTxHash as string);

        return {
          txid,
          index,
          script: script.toASM(input.script),
          sequence: input.sequence,
          addr: getAddr(inputTx.outs[0] as TxOutput) as string,
          inputTx
        };
      } catch (error) {
        return {
          txid,
          index,
          addr: '',
          // script: input.script ? script.toASM(input.script) : null,
          sequence: input.sequence
        };
      }
    }
  )
  let vin: Input[] = [];
  try {
    vin = await Promise.all(fetchVins);
  } catch (error) {
    console.error('error fetching vins', error);
  }

  const format = (out: TxOutput, n: number) => {
    const vout = {
      satoshi: out.value,
      value: parseFloat((1e-8 * out.value).toFixed(8)),
      n,
      scriptPubKey: {
        asm: script.toASM(out.script),
        hex: out.script.toString('hex'),
        addresses: []
      },
      addr: getAddr(out) as string
    };
    return vout;
  };

  const vout: Output[] = tx.outs.map((out, n) => format(out as TxOutput, n));

  const value = parseFloat((1e-8 * networkData.value).toFixed(8));

  const decodedTx = {
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

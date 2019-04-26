import {
  Transaction as BTCTransaction, TxOutput, address, networks, script,
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
  addr: string,
  value: number,
  [key: string]: any,
}

interface Input {
  addr: string,
  txid: string,
  [key: string]: any,
}

export const decodeTx = async (tx: BTCTransaction, networkData: Transaction) => {
  const fetchVins: Promise<Input>[] = tx.ins.map((input, index) => new Promise(async (resolve) => {
    const txid = input.hash.reverse().toString('hex');
    const inputTxHash = await fetchRawTxInfo(txid);
    const inputTx = BTCTransaction.fromHex(<string>inputTxHash);

    return resolve({
      txid,
      index,
      script: script.toASM(input.script),
      sequence: input.sequence,
      addr: <string>getAddr(<TxOutput>inputTx.outs[0]),
      inputTx,
    });
  }));
  const vin: Input[] = await Promise.all(fetchVins);

  const format = (out: TxOutput, n: number) => {
    const vout = {
      satoshi: out.value,
      value: parseFloat((1e-8 * out.value).toFixed(8)),
      n,
      scriptPubKey: {
        asm: script.toASM(out.script),
        hex: out.script.toString('hex'),
        addresses: [],
      },
      addr: <string>getAddr(out),
    };
    return vout;
  };

  const vout: Output[] = tx.outs.map((out, n) => format(<TxOutput>out, n));

  const value = parseFloat((1e-8 * networkData.value).toFixed(8));

  const decodedTx = {
    ...tx,
    vin,
    vout,
    blockheight: networkData.blockHeight,
    ...networkData,
    value,
    valueOut: value,
  };

  return decodedTx;
};

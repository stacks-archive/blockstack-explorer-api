import {
  Transaction as BTCTransaction, TxOutput, address, networks, script, payments,
} from 'bitcoinjs-lib';
import { Transaction } from './bitcore-db/queries';
import { fetchRawTxInfo } from './client/core-api';
import { Input } from 'bitcoinjs-lib/types/transaction';

const getAddr = (out: TxOutput) => {
  let addr: string | null = null;
  try {
    addr = address.fromOutputScript(out.script, networks.bitcoin);
  } catch (error) {
    // nothing
  }
  return addr;
};

export const getInputAddr = (input: Input) => {
  const pmt = payments.p2pkh({
    input: input.script,
    network: networks.bitcoin,
  });
  return pmt.address;
};

interface Output {
  addr: string,
  value: number,
  [key: string]: any,
}

export const decodeTx = async (tx: BTCTransaction, networkData: Transaction) => {
  const fetchVins: Promise<Input>[] = tx.ins.map(async (input, index) => {
    const txid = input.hash.reverse().toString('hex');
    try {
      const inputTxHash = await fetchRawTxInfo(txid);
      const inputTx = BTCTransaction.fromHex(<string>inputTxHash);
      return {
        txid,
        index,
        script: Buffer.from(input.script),
        sequence: input.sequence,
        addr: <string>getAddr(<TxOutput>inputTx.outs[0]),
        inputTx,
        hash: undefined,
        witness: undefined,
      } as Input;
    } catch (error) {
      return {
        txid,
        index,
        addr: '',
        // script: input.script ? script.toASM(input.script) : null,
        script: undefined,
        hash: undefined,
        witness: undefined,
        sequence: input.sequence,
      } as Input;
    }
  });
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

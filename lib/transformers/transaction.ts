import { btcValue } from '../utils';
import { BlockchainInfoTx } from '../client/core-api';

export type TransformedBlockchainInfoTx = BlockchainInfoTx & {
  txHash: string;
  valueOut: number;
  value: number;
  action: string;
  txid: string;
  time: number;
};

export const transformTx = (tx: BlockchainInfoTx, addr: string): TransformedBlockchainInfoTx => {
  const vin = addr
    ? tx.inputs.find(
      v => v.prev_out && v.prev_out.addr && v.prev_out.addr === addr
    )
    : null;
  const vout = addr ? tx.out.find(v => v.addr === addr) : null;
  // const valueOut = tx.out.reduce((accumulator = 0, out) => accumulator + out.value);
  let valueOut = 0;
  tx.out.forEach(out => {
    valueOut += parseInt(out.value);
  });

  return {
    txHash: tx.hash,
    valueOut: (((vout && vout.value) ? parseInt(vout.value) : valueOut) || valueOut) * 10e-7,
    // value: vout ? (vout.value || tx.valueOut) : tx.valueIn,
    value: btcValue(vin ? valueOut : ((vout && vout.value) ? parseInt(vout.value) : valueOut) || valueOut),
    action: vin ? 'Sent' : 'Received',
    txid: tx.hash,
    ...tx
  };
};

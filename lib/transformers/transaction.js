// import { btcValue } from '../utils';
const { btcValue } = require('../utils');

const transformTx = (tx, addr) => {
  const vin = addr
    ? tx.inputs.find(
      v => v.prev_out && v.prev_out.addr && v.prev_out.addr === addr
    )
    : null;
  const vout = addr ? tx.out.find(v => v.addr === addr) : null;
  // const valueOut = tx.out.reduce((accumulator = 0, out) => accumulator + out.value);
  let valueOut = 0;
  tx.out.forEach(out => {
    valueOut += out.value;
  });

  return {
    txHash: tx.hash,
    valueOut: ((vout && vout.value) || valueOut) * 10e-7,
    // value: vout ? (vout.value || tx.valueOut) : tx.valueIn,
    value: btcValue(vin ? valueOut : (vout && vout.value) || valueOut),
    action: vin ? 'Sent' : 'Received',
    txid: tx.hash,
    ...tx
  };
};

module.exports = transformTx;

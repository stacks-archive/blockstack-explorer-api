import Aggregator from './aggregator';

import { fetchAddress } from '../client/core-api';
import transformTx from '../transformers/transaction';

class BTCAddressAggregator extends Aggregator {
  static key(address, txPage = 0) {
    return `BTCAddress:${address}?txPage=${txPage}`;
  }

  static async setter(addr, txPage = 0) {
    const perPage = 10;
    const address = await fetchAddress(addr, perPage, perPage * txPage);
    const fullTransactions = address.txs.map(tx => transformTx(tx, addr));

    const { txs, ...rest } = address;

    return {
      ...rest,
      totalSent: address.total_sent * 10e-9,
      totalReceived: address.total_received * 10e-9,
      balance: address.final_balance * 10e-9,
      fullTransactions,
    };
  }

  static expiry() {
    return 60 * 10; // 10 minutes
  }
}

module.exports = BTCAddressAggregator;
export default BTCAddressAggregator;

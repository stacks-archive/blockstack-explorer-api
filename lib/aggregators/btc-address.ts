import { AggregatorWithArgs } from './aggregator';
import { fetchAddress, BlockchainAddressInfo } from '../client/core-api';
import { transformTx, TransformedBlockchainInfoTx } from '../transformers/transaction';

type BTCAddressAggregatorOpts = {
  address: string;
  txPage?: number;
}

type BTCAddressAggregatorResult = BlockchainAddressInfo & {
  totalSent: number;
  totalReceived: number;
  balance: number;
  fullTransactions: TransformedBlockchainInfoTx[];
}

class BTCAddressAggregator extends AggregatorWithArgs<BTCAddressAggregatorResult, BTCAddressAggregatorOpts> {
  key({address, txPage = 0}: BTCAddressAggregatorOpts) {
    return `BTCAddress:${address}?txPage=${txPage}`;
  }

  async setter({address, txPage = 0}: BTCAddressAggregatorOpts) {
    const perPage = 10;
    const fetchedAddress = await fetchAddress(address, perPage, perPage * txPage);
    const fullTransactions = fetchedAddress.txs.map((tx) => transformTx(tx, address));

    const { txs, ...rest } = fetchedAddress;

    return {
      ...rest,
      totalSent: fetchedAddress.total_sent * 10e-9,
      totalReceived: fetchedAddress.total_received * 10e-9,
      balance: fetchedAddress.final_balance * 10e-9,
      fullTransactions
    };
  }

  expiry() {
    return 60 * 10; // 10 minutes
  }
}

export default new BTCAddressAggregator();

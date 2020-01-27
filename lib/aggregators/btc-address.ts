import { AggregatorWithArgs, AggregatorSetterResult } from './aggregator';
import { fetchAddress } from '../client/core-api';

type BTCAddressAggregatorOpts = {
  address: string;
  txPage?: number;
};

type BTCAddressTxInfo = {
  txid: string;
  value: number;
  action: string;
  time: number;
};

type BTCAddressAggregatorResult = {
  totalSent: number;
  totalReceived: number;
  balance: number;
  transactions: BTCAddressTxInfo[];
  totalTransactionsCount: number;
  names: string[];
};

class BTCAddressAggregator extends AggregatorWithArgs<BTCAddressAggregatorResult, BTCAddressAggregatorOpts> {
  key({address, txPage = 0}: BTCAddressAggregatorOpts) {
    return `BTCAddress:${address}?txPage=${txPage}`;
  }

  async setter({address, txPage = 0}: BTCAddressAggregatorOpts): Promise<AggregatorSetterResult<BTCAddressAggregatorResult>> {
    const perPage = 10;
    const fetchedAddress = await fetchAddress(address, txPage, perPage);

    const txs: BTCAddressTxInfo[] = fetchedAddress.btcTransactions.map(tx => {
      const action = tx.action.charAt(0).toUpperCase() + tx.action.slice(1)
      const result : BTCAddressTxInfo = {
        txid: tx.txid,
        value: tx.totalTransferred,
        action: action,
        time: tx.blockTime,
      };
      return result;
    });

    const result: BTCAddressAggregatorResult = {
      totalSent: fetchedAddress.btcBalanceInfo.totalSent,
      totalReceived: fetchedAddress.btcBalanceInfo.totalReceived,
      balance: fetchedAddress.btcBalanceInfo.balance,
      transactions: txs,
      totalTransactionsCount: fetchedAddress.btcBalanceInfo.totalTransactions,
      names: fetchedAddress.blockstackCoreData?.names || [],
    };
    return {
      shouldCacheValue: true,
      value: result,
    };
  }

  expiry() {
    return 60 * 10; // 10 minutes
  }
}

export default new BTCAddressAggregator();

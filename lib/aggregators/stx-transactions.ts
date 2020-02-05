import { Aggregator, AggregatorSetterResult, KeepAliveOptions } from './aggregator';
import { StacksTransaction, getRecentStacksTransfers } from '../core-db-pg/queries';
import { getTimesForBlockHeights } from '../bitcore-db/queries';
import { getStxAddresses } from '../addresses';


export type StxTransactionsAggregatorOpts = {
  page: number;
};

export type StxTransactionsAggregatorResult = (StacksTransaction & {
  timestamp: number;
  senderSTX?: string;
  recipientSTX?: string;
})[];

class StxTransactionsAggregator extends Aggregator<StxTransactionsAggregatorResult, StxTransactionsAggregatorOpts> {

  key(args: StxTransactionsAggregatorOpts) {
    return `StxTransactions:${args.page}`;
  }

  expiry() {
    return 15 * 60; // 15 minutes
  }

  getKeepAliveOptions(key: string, args: StxTransactionsAggregatorOpts): KeepAliveOptions {
    if (args.page === 0) {
      return {
        aggregatorKey: key,
        aggregatorArgs: {page: 0},
        interval: 10 * 60 // 10 minutes,
      };
    } else {
      return false;
    }
  }

  async setter({ page }: StxTransactionsAggregatorOpts): Promise<AggregatorSetterResult<StxTransactionsAggregatorResult>> {
    const limit = 100;
    const transactions = await getRecentStacksTransfers(limit, page);
    const blockTimes = await getTimesForBlockHeights(
      transactions.map(tx => tx.blockHeight)
    );
    const transfers = transactions.map(tx => ({
      ...tx,
      timestamp: blockTimes[tx.blockHeight],
      ...getStxAddresses(tx)
    }));
    return {
      shouldCacheValue: true,
      value: transfers,
    };
  }
}

const stxTransactionsAggregator = new StxTransactionsAggregator();

export default stxTransactionsAggregator;

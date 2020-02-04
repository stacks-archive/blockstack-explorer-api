import { Aggregator, AggregatorSetterResult, KeepAliveOptions } from './aggregator';
import { getAllHistoryRecords, HistoryRecordResult } from '../core-db-pg/queries';
import { getTimesForBlockHeights } from '../bitcore-db/queries';
import { getStxAddresses } from '../addresses';


export type TransactionsAggregatorOpts = {
  page: number;
};

export type TransactionsAggregatorResult = (HistoryRecordResult & {
  senderSTX?: string;
  recipientSTX?: string;
  timestamp: number;
})[];

class TransactionsAggregator extends Aggregator<TransactionsAggregatorResult, TransactionsAggregatorOpts> {

  key(args: TransactionsAggregatorOpts) {
    return `Transactions:${args.page}`;
  }

  expiry() {
    return 15 * 60; // 15 minutes
  }

  async getInitialKeepAliveOptions(): Promise<KeepAliveOptions> {
    return {
      aggregatorKey: await this.keyWithTag({page: 0}),
      aggregatorArgs: {page: 0},
      interval: 10 * 60 // 10 minutes,
    };
  }

  async setter({ page }: TransactionsAggregatorOpts): Promise<AggregatorSetterResult<TransactionsAggregatorResult>> {
    const limit = 100;
    const historyResult = await getAllHistoryRecords(limit, page);
    const heights = historyResult.map(item => item.block_id);
    const blockTimes = await getTimesForBlockHeights(heights);
    const history = historyResult.map(historyRecord => ({
      ...historyRecord,
      timestamp: blockTimes[historyRecord.block_id],
      ...getStxAddresses(historyRecord)
    }));
    return { 
      shouldCacheValue: true,
      value: history,
    };
  }
}

const transactionsAggregator = new TransactionsAggregator();

export default transactionsAggregator;

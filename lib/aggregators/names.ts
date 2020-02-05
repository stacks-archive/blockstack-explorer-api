import { Aggregator, AggregatorSetterResult, KeepAliveOptions } from './aggregator';
import { getRecentSubdomains, NameRecord, getRecentNames } from '../core-db-pg/queries';
import { getTimesForBlockHeights } from '../bitcore-db/queries';


export type NamesAggregatorOpts = {
  page: number;
};

export type NamesAggregatorResult = (NameRecord & {
  timestamp: number;
})[];

class NamesAggregator extends Aggregator<NamesAggregatorResult, NamesAggregatorOpts> {

  key(args: NamesAggregatorOpts) {
    return `Names:${args.page}`;
  }

  expiry() {
    return 15 * 60; // 15 minutes
  }

  getKeepAliveOptions(key: string, args: NamesAggregatorOpts): KeepAliveOptions {
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

  async setter({ page }: NamesAggregatorOpts): Promise<AggregatorSetterResult<NamesAggregatorResult>> {
    const limit = 100;
    const namesResult = await getRecentNames(limit, page);
    const blockTimes = await getTimesForBlockHeights(
      namesResult.map(name => name.block_number)
    );
    const names = namesResult.map(name => ({
      ...name,
      timestamp: blockTimes[name.block_number]
    }));
    return {
      shouldCacheValue: true,
      value: names,
    };
  }
}

const namesAggregator = new NamesAggregator();

export default namesAggregator;

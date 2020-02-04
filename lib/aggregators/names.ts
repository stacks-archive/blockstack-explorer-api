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

  async getInitialKeepAliveOptions(): Promise<KeepAliveOptions> {
    return {
      aggregatorKey: await this.keyWithTag({page: 0}),
      aggregatorArgs: {page: 0},
      interval: 10 * 60 // 10 minutes,
    };
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

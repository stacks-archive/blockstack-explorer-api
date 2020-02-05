import { Aggregator, AggregatorSetterResult, KeepAliveOptions } from './aggregator';
import {
  getAllNameOperations,
} from '../core-db-pg/queries';
import { getTimesForBlockHeights } from '../bitcore-db/queries';

export type NameOp = {
  name: string;
  owner: string;
  time: number;
  block: number;
};

export type NameOpsAggregatorResult = NameOp[];
export type NameOpsAggregatorArgs = {
  page: number;
};

class NameOpsAggregator extends Aggregator<NameOpsAggregatorResult, NameOpsAggregatorArgs> {
  expiry() {
    return 15 * 60; // 15 minutes
  }

  key({page = 0}: NameOpsAggregatorArgs) {
    return `NameOpsAggregator:${page || 0}`;
  }

  getKeepAliveOptions(key: string, args: NameOpsAggregatorArgs): KeepAliveOptions {
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

  async setter({page = 0}: NameOpsAggregatorArgs): Promise<AggregatorSetterResult<NameOpsAggregatorResult>> {
    const history = await getAllNameOperations(page);
    const blockHeights = [...new Set(history.map(record => record.block_id))];
    const blockTimes = await getTimesForBlockHeights(blockHeights);

    const nameOps: NameOp[] = history.map(record => {
      const time = blockTimes[record.block_id]
      const isSubdomain = !!record.fully_qualified_subdomain
      const op: NameOp = {
        time,
        block: record.block_id,
        name: isSubdomain ? record.fully_qualified_subdomain : record.history_id,
        owner: isSubdomain ? record.owner : record.creator_address
      }
      return op;
    })
    return {
      shouldCacheValue: true,
      value: nameOps,
    };
  }
}

export default new NameOpsAggregator();

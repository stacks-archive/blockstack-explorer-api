import * as BluebirdPromise from 'bluebird';

import { AggregatorWithArgs } from './aggregator';
import {
  getAllNameOperations,
  getSubdomainRegistrationsForTxid,
  Subdomain
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

class NameOpsAggregator extends AggregatorWithArgs<NameOpsAggregatorResult, NameOpsAggregatorArgs> {
  expiry() {
    return 10 * 60; // 10 minutes
  }

  key({page = 0}: NameOpsAggregatorArgs) {
    return `NameOpsAggregator:${page || 0}`;
  }

  async setter({page = 0}: NameOpsAggregatorArgs): Promise<NameOpsAggregatorResult> {
    const history = await getAllNameOperations(page);
    const blockHeights = history.map(record => record.block_id);
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
      return op
    })
    return nameOps
  }
}

export default new NameOpsAggregator();

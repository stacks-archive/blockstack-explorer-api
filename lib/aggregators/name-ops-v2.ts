import * as BluebirdPromise from 'bluebird';

import { Aggregator } from './aggregator';
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

class NameOpsAggregator extends Aggregator<NameOpsAggregatorResult> {
  expiry() {
    return 10 * 60; // 10 minutes
  }

  async setter(): Promise<NameOpsAggregatorResult> {
    const history = await getAllNameOperations();
    const blockHeights = history.map(record => record.block_id);
    const blockTimes = await getTimesForBlockHeights(blockHeights);
    const nameOps = await BluebirdPromise.map(
      history,
      async (historyRecord): Promise<NameOp | NameOp[]> => {
        const time = blockTimes[historyRecord.block_id];
        if (historyRecord.opcode === 'NAME_REGISTRATION') {
          const row: NameOp = {
            name: historyRecord.history_id,
            owner: historyRecord.creator_address,
            time,
            block: historyRecord.block_id
          };
          return row;
        }
        const subdomains = await getSubdomainRegistrationsForTxid(
          historyRecord.txid
        );
        const results: NameOp[] = subdomains.map((subdomain: Subdomain) => ({
          name: subdomain.name,
          owner: subdomain.owner,
          time,
          block: subdomain.blockHeight
        }));
        return results;
      }
    );

    const flattened = nameOps.reduce<NameOp[]>((a, b) => a.concat(b), []);
    return flattened;
  }
}

export default new NameOpsAggregator();

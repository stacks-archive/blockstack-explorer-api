import BluebirdPromise from 'bluebird';

import Aggregator from './aggregator';
import { getAllNameOperations, getSubdomainRegistrationsForTxid } from '../core-db-pg/queries';
import { blockToTime } from '../utils';

interface NameOp {
  name: string,
  owner: string,
  time: number,
  block: number,
}

class NameOpsAggregator extends Aggregator {
  static expiry() {
    return 10 * 60; // 10 minutes
  }

  static async setter(): Promise<NameOp[]> {
    const history = await getAllNameOperations();
    const nameOps = await BluebirdPromise.map(history, async (historyRecord): Promise<NameOp | NameOp[]> => {
      if (historyRecord.opcode === 'NAME_REGISTRATION') {
        const row: NameOp = {
          name: historyRecord.history_id,
          owner: <string>historyRecord.creator_address,
          time: blockToTime(historyRecord.block_id),
          block: historyRecord.block_id,
        };
        return row;
      }
      const subdomains = await getSubdomainRegistrationsForTxid(historyRecord.txid);
      const results: NameOp[] = subdomains.map(subdomain => ({
        name: subdomain.name,
        owner: subdomain.owner,
        time: blockToTime(subdomain.blockHeight),
        block: subdomain.blockHeight,
      }));
      return results;
    });

    const flattened = nameOps.reduce<NameOp[]>((a, b) => a.concat(b), []);
    return flattened;
  }
}

export default NameOpsAggregator;

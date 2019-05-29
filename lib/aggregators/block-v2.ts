import BluebirdPromise from 'bluebird';
import moment from 'moment';
import Sentry from '@sentry/node';

import Aggregator from './aggregator';
import {
  fetchNameOperations, fetchTransactionSubdomains, fetchName,
} from '../client/core-api';
import { getBlock, getBlockTransactions, getBlockHash } from '../bitcore-db/queries';

class BlockAggregator extends Aggregator {
  static key(hash: string) {
    return `Block:${hash}`;
  }

  static async setter(hashOrHeight: string) {
    let hash = hashOrHeight;
    if (hash.toString().length < 10) {
      hash = await getBlockHash(hashOrHeight);
    }
    const block = await getBlock(hash);
    if (!block) {
      return null;
    }
    const transactions = await getBlockTransactions(hash);
    block.transactions = transactions;
    const nameOperations = await fetchNameOperations(block.height);
    const { time } = block;
    block.nameOperations = await BluebirdPromise.map(nameOperations, async (_nameOp) => {
      try {
        const nameOp: any = { ..._nameOp };
        nameOp.timeAgo = moment(time * 1000).fromNow(true);
        nameOp.time = time * 1000;
        if (nameOp.opcode === 'NAME_UPDATE' && (nameOp.name === 'id.blockstack')) {
          const { txid } = nameOp;
          const subdomains = await fetchTransactionSubdomains(txid);
          nameOp.subdomains = subdomains;
        }
        return nameOp;
      } catch (error) {
        console.error(error);
        Sentry.captureException(error);
        return null;
      }
    }, { concurrency: 1 });

    block.nameOperations = (<any[]>block.nameOperations).filter(Boolean);

    return block;
  }

  static expiry() {
    return 60 * 60 * 24 * 2; // 2 days
  }

  static verbose(hash: string, multi: any) {
    return !multi;
  }
}

export default BlockAggregator;

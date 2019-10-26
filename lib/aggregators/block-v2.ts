import BluebirdPromise from 'bluebird';
import moment from 'moment';
import * as Sentry from '@sentry/node';

import Aggregator from './aggregator';
import {
  fetchNameOperations, fetchTransactionSubdomains, fetchName,
} from '../client/core-api';
import {
  getBlock, getBlockTransactions, getBlockHash, Transaction,
} from '../bitcore-db/queries';
import {
  getNameOperationsForBlock, getSubdomainRegistrationsForTxid,
} from '../core-db-pg/queries';
import { btcValue, formatNumber } from '../utils';

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
    const transactions: Transaction[] = await getBlockTransactions(hash);
    block.transactions = transactions.map(tx => ({
      ...tx,
      value: btcValue(tx.value),
    }));
    // const nameOperations = await fetchNameOperations(block.height);
    const nameOperations = await getNameOperationsForBlock(block.height);
    const { time } = block;
    block.nameOperations = await BluebirdPromise.map(nameOperations, async (_nameOp) => {
      try {
        const nameOp: any = { ..._nameOp };
        nameOp.timeAgo = moment(time * 1000).fromNow(true);
        nameOp.time = time * 1000;
        if (nameOp.opcode === 'NAME_UPDATE') {
          const { txid } = nameOp;
          // const subdomains = await fetchTransactionSubdomains(txid);
          const subdomains = await getSubdomainRegistrationsForTxid(txid);
          nameOp.subdomains = subdomains;
        }
        return nameOp;
      } catch (error) {
        console.error(error);
        Sentry.captureException(error);
        return null;
      }
    }, { concurrency: 1 });

    block.rewardFormatted = formatNumber(btcValue(block.reward));

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

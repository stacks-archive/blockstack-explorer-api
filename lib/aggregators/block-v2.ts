import * as BluebirdPromise from 'bluebird';
import * as moment from 'moment';
import * as Sentry from '@sentry/node';
import * as multi from 'multi-progress';

import { AggregatorWithArgs } from './aggregator';
import {
  getBlock,
  getBlockTransactions,
  getBlockHash,
  BitcoreTransaction,
  Block
} from '../bitcore-db/queries';
import {
  getNameOperationsForBlock,
  getSubdomainRegistrationsForTxid,
  Subdomain,
  NameOperationsForBlockResult
} from '../core-db-pg/queries';
import { btcValue, formatNumber } from '../utils';


/** hashOrHeight */
type BlockAggregatorOpts = string;

export type HistoryInfoNameOp = NameOperationsForBlockResult & {
  timeAgo?: string;
  time?: number;
  subdomains?: Subdomain[];
}

class BlockAggregator extends AggregatorWithArgs<Block, BlockAggregatorOpts> {
  key(hashOrHeight: BlockAggregatorOpts) {
    return `Block:${hashOrHeight}`;
  }

  async setter(hashOrHeight: BlockAggregatorOpts) {
    let hash = hashOrHeight;
    if (hash.toString().length < 10) {
      hash = await getBlockHash(hashOrHeight);
    }
    const block = await getBlock(hash);
    if (!block) {
      return null;
    }
    const transactions: BitcoreTransaction[] = await getBlockTransactions(hash);
    block.transactions = transactions.map(tx => ({
      ...tx,
      value: btcValue(tx.value)
    }));
    // const nameOperations = await fetchNameOperations(block.height);
    const nameOperations = await getNameOperationsForBlock(block.height);
    const { time } = block;
    block.nameOperations = await BluebirdPromise.map(
      nameOperations,
      async _nameOp => {
        try {
          const nameOp: HistoryInfoNameOp = { ..._nameOp };
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
      },
      { concurrency: 1 }
    );

    block.rewardFormatted = formatNumber(btcValue(block.reward));

    block.nameOperations = block.nameOperations.filter(Boolean);

    return block;
  }

  expiry() {
    return 60 * 60 * 24 * 2; // 2 days
  }

  verbose(hashOrHeight: BlockAggregatorOpts, multi?: multi) {
    return !multi;
  }
}

export default new BlockAggregator();

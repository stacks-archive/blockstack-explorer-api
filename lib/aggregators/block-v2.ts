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
  BitcoreBlock
} from '../bitcore-db/queries';
import {
  getNameOperationsForBlock,
  getSubdomainRegistrationsForTxid,
  Subdomain,
  NameOperationsForBlockResult
} from '../core-db-pg/queries';
import { btcValue } from '../utils';


/** hashOrHeight */
type BlockAggregatorOpts = string;

export type HistoryInfoNameOp = NameOperationsForBlockResult & {
  timeAgo?: string;
  time?: number;
  subdomains?: Subdomain[];
}

export type BlockAggregatorResult = BitcoreBlock & {
  transactions: BitcoreTransaction[];
  nameOperations: NameOperationsForBlockResult[];
  rewardFormatted: string;
};

class BlockAggregator extends AggregatorWithArgs<BlockAggregatorResult, BlockAggregatorOpts> {
  key(hashOrHeight: BlockAggregatorOpts) {
    return `Block:${hashOrHeight}`;
  }

  async setter(hashOrHeight: BlockAggregatorOpts): Promise<BlockAggregatorResult> {
    let hash: string;
    if (hashOrHeight.toString().length < 10) {
      hash = await getBlockHash(hashOrHeight);
    } else {
      hash = hashOrHeight;
    }
    if (!hash) {
      return null;
    }
    const block = await getBlock(hash);
    if (!block) {
      return null;
    }
    // TODO: add Stacks transactions
    let transactions: BitcoreTransaction[] = await getBlockTransactions(hash);
    transactions = transactions.map(tx => ({
      ...tx,
    }));
    let nameOperations = await getNameOperationsForBlock(block.height);
    nameOperations = await BluebirdPromise.map(
      nameOperations,
      async _nameOp => {
        try {
          const nameOp: HistoryInfoNameOp = { ..._nameOp };
          // TODO: this should be removed and formatted for display on the front-end.
          nameOp.timeAgo = moment(block.time * 1000).fromNow(true);
          nameOp.time = block.time;
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
    nameOperations = nameOperations.filter(Boolean);
    const rewardFormatted = btcValue(block.reward, true);

    const result = {
      ...block,
      nameOperations,
      transactions,
      rewardFormatted
    };
    return result;
  }

  expiry() {
    return 60 * 60 * 24 * 2; // 2 days
  }

  verbose(hashOrHeight: BlockAggregatorOpts, multi?: multi) {
    return !multi;
  }
}

export default new BlockAggregator();

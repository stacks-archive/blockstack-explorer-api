import * as Promise from 'bluebird';
import * as moment from 'moment';
import * as Sentry from '@sentry/node';
import * as multi from 'multi-progress';

import { AggregatorWithArgs, Json } from './aggregator';
import { fetchBlock, fetchTransactionSubdomains } from '../client/core-api';

/** hash */
type BlockAggregatorOpts = string;

class BlockAggregator extends AggregatorWithArgs<Json, BlockAggregatorOpts> {
  key(hash: BlockAggregatorOpts) {
    return `Block:${hash}`;
  }

  async setter(hash: BlockAggregatorOpts) {
    const block = await fetchBlock(hash);
    if (!block) {
      return null;
    }
    block.transactions = block.transactions.slice(0, 10);
    const { time } = block;
    block.nameOperations = await Promise.map(
      block.nameOperations,
      async (_nameOp: any) => {
        try {
          const nameOp = { ..._nameOp };
          nameOp.timeAgo = moment(time * 1000).fromNow(true);
          nameOp.time = time * 1000;
          if (
            nameOp.opcode === 'NAME_UPDATE' &&
            nameOp.name === 'id.blockstack'
          ) {
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
      },
      { concurrency: 1 }
    );

    block.nameOperations = block.nameOperations.filter(Boolean);

    return block;
  }

  expiry() {
    return 60 * 60 * 24 * 2; // 2 days
  }

  verbose(hash: BlockAggregatorOpts, multi?: multi) {
    return !multi;
  }

}

const blockAggregator = new BlockAggregator();

export default blockAggregator;

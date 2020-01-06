import * as moment from 'moment';
import * as BlueBirdPromise from 'bluebird';
import * as multi from 'multi-progress';

import { AggregatorWithArgs } from './aggregator';
import BlockAggregator from './block-v2';

import { getBlocks, Block } from '../bitcore-db/queries';

export type BlockAggregatorOpts = {
  date: string | undefined;
  page: number;
}

class BlocksAggregator extends AggregatorWithArgs<Block[], BlockAggregatorOpts> {
  key({date, page}: BlockAggregatorOpts) {
    if (!date) {
      const now = this.now();
      return `Blocks:${now}:${page}`;
    }
    return `Blocks:${date}:${page}`;
  }

  async setter({date, page}: BlockAggregatorOpts) {
    const blocks = await getBlocks(date, page);
    const concurrency = process.env.API_CONCURRENCY
      ? parseInt(process.env.API_CONCURRENCY, 10)
      : 1;
    const getBlock = async (_block: Block) => {
      try {
        const blockData = await BlockAggregator.fetch(_block.hash);
        return {
          ...blockData,
          _block
        };
      } catch (error) {
        console.error(error);
        return _block;
      }
    }
    return BlueBirdPromise.map(blocks, getBlock, { concurrency });
  }

  expiry({date}: BlockAggregatorOpts) {
    if (!date || date === this.now()) return 10 * 60; // 10 minutes
    return null;
  }

  verbose(opts: BlockAggregatorOpts, multi?: multi) {
    return !multi;
  }

  now(): string {
    return moment()
      .utc()
      .format('YYYY-MM-DD');
  }
}

export default new BlocksAggregator();

import * as moment from 'moment';
import * as BlueBirdPromise from 'bluebird';
import * as multi from 'multi-progress';

import { AggregatorWithArgs } from './aggregator';
import BlockAggregator, { BlockAggregatorResult } from './block-v2';

import { getBlocks, BitcoreBlock } from '../bitcore-db/queries';

export type BlockAggregatorOpts = {
  date: string | undefined;
  page: number;
}

export type BlocksAggregatorResult = Partial<BlockAggregatorResult> & BitcoreBlock & {
  _block?: BitcoreBlock;
};

class BlocksAggregator extends AggregatorWithArgs<BlocksAggregatorResult[], BlockAggregatorOpts> {
  key({date, page}: BlockAggregatorOpts) {
    if (!date) {
      const now = this.now();
      return `Blocks:${now}:${page}`;
    }
    return `Blocks:${date}:${page}`;
  }

  async setter({date, page}: BlockAggregatorOpts): Promise<BlocksAggregatorResult[]> {
    const blocks = await getBlocks(date, page);
    const concurrency = process.env.API_CONCURRENCY
      ? parseInt(process.env.API_CONCURRENCY, 10)
      : 1;
    const result = await BlueBirdPromise.map(blocks, async (block) => {
      try {
        const blockData = await BlockAggregator.fetch(block.hash);
        return {
          ...blockData,
          _block: block
        };
      } catch (error) {
        console.error(error);
        return block;
      }
    }, { concurrency });
    return result;
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

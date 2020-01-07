import * as moment from 'moment';
import * as BluebirdPromise from 'bluebird';
import * as multi from 'multi-progress';
import { AggregatorWithArgs, Json } from './aggregator';
import BlockAggregator, { BlockAggregatorResult } from './block';

import { fetchBlocks, BlockchainInfoBlock } from '../client/core-api';


/** date */
type BlockAggregatorOpts = string;

export type BlocksAggregatorResult = Partial<BlockAggregatorResult> & BlockchainInfoBlock;

class BlocksAggregator extends AggregatorWithArgs<BlocksAggregatorResult[], BlockAggregatorOpts> {
  key(date: BlockAggregatorOpts) {
    if (!date) {
      const now = this.now();
      return `Blocks:${now}`;
    }
    return `Blocks:${date}`;
  }

  async setter(date: BlockAggregatorOpts, multi?: multi) {
    const blocks = await fetchBlocks(date);
    let bar: ProgressBar;
    if (multi) {
      bar = multi.newBar(
        'downloading [:bar] :current / :total :percent :etas',
        { total: blocks.length }
      );
    }
    const blocksResult = await BluebirdPromise.map(blocks, async (_block) => {
      try {
        const blockData = await BlockAggregator.fetch(_block.hash, multi);
        if (bar) bar.tick();
        return {
          ...blockData,
          _block,
        };
      } catch (error) {
        console.error(error);
        if (bar) bar.tick();
        return _block;
      }
    }, {
      concurrency: process.env.API_CONCURRENCY ? parseInt(process.env.API_CONCURRENCY, 10) : 1,
    });
    return blocksResult;
  }

  expiry(date: BlockAggregatorOpts) {
    if (!date || date === this.now()) return 10 * 60; // 10 minutes
    return null;
  }

  verbose(date: BlockAggregatorOpts, multi?: multi) {
    return !multi;
  }

  now() {
    return moment()
      .utc()
      .format('YYYY-MM-DD');
  }
}

export default new BlocksAggregator();

import * as moment from 'moment';
import * as BluebirdPromise from 'bluebird';
import * as multi from 'multi-progress';
import { AggregatorWithArgs, Json } from './aggregator';
import BlockAggregator from './block';

import { fetchBlocks } from '../client/core-api';


/** date */
type BlockAggregatorOpts = string;

class BlocksAggregator extends AggregatorWithArgs<Json, BlockAggregatorOpts> {
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
    return BluebirdPromise.map(blocks, async (_block: any) => {
      try {
        const blockData = await BlockAggregator.fetch(_block.hash, multi);
        if (bar) bar.tick();
        return {
          ...(blockData as any),
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

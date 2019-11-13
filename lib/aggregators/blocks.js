import moment from 'moment';
import Promise from 'bluebird';

import Aggregator from './aggregator';
import BlockAggregator from './block';

import { fetchBlocks } from '../client/core-api';

class BlocksAggregator extends Aggregator {
  static key(date) {
    if (!date) {
      const now = this.now();
      return `Blocks:${now}`;
    }
    return `Blocks:${date}`;
  }

  static async setter(date, multi) {
    const blocks = await fetchBlocks(date);
    let bar;
    if (multi) {
      bar = multi.newBar('downloading [:bar] :current / :total :percent :etas', { total: blocks.length });
    }
    return Promise.map(blocks, async (_block) => {
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
  }

  static expiry(date) {
    if (!date || (date === this.now())) return 10 * 60; // 10 minutes
    return null;
  }

  static verbose(date, multi) {
    return !multi;
  }

  static now() {
    return moment()
      .utc()
      .format('YYYY-MM-DD');
  }
}

module.exports = BlocksAggregator;
export default BlocksAggregator;

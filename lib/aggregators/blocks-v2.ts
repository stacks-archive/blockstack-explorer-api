import * as moment from 'moment';
import * as BlueBirdPromise from 'bluebird';
import * as multi from 'multi-progress';

import { AggregatorWithArgs } from './aggregator';
import BlockAggregator, { BlockAggregatorResult } from './block-v2';

import { getBlocks, BitcoreBlock } from '../bitcore-db/queries';
import { getNameOperationsForBlocks } from '../core-db-pg/queries';

export type BlockAggregatorOpts = {
  date: string | undefined;
  page: number;
}

export type BlocksAggregatorResult = {
  blocks: {
    totalNameOperations: any;
    hash: string;
    height: number;
    time: number;
    size: number;
    txCount: number;
    reward: number;
  }[];
  availableCount: number;
};

class BlocksAggregator extends AggregatorWithArgs<BlocksAggregatorResult, BlockAggregatorOpts> {
  key({date, page}: BlockAggregatorOpts) {
    if (!date) {
      const now = this.now();
      return `Blocks:${now}:${page}`;
    }
    return `Blocks:${date}:${page}`;
  }

  async setter({date, page}: BlockAggregatorOpts): Promise<BlocksAggregatorResult> {
    const blocksResult = await getBlocks(date, page);
    const blockHeights = blocksResult.blocks.map(block => block.height);
    const nameOpts = await getNameOperationsForBlocks(blockHeights);
    const blocks = blocksResult.blocks.map(block => {
      const nameOps = nameOpts[block.height] || 0;
      return Object.assign(block, { totalNameOperations: nameOps });
    })
    return {
      blocks: blocks,
      availableCount: blocksResult.totalCount,
    };
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

import * as Promise from 'bluebird';
import * as moment from 'moment';
import * as Sentry from '@sentry/node';
import * as multi from 'multi-progress';

import { AggregatorWithArgs } from './aggregator';
import { 
  fetchBlock, fetchTransactionSubdomains, BlockchainInfoBlockResult, 
  BlockstackCoreBitcoinBlockNameOps, SubdomainTransactionResult 
} from '../client/core-api';

/** hash */
type BlockAggregatorOpts = string;

export type BlockAggregatorNameOperationResult = BlockstackCoreBitcoinBlockNameOps & {
  timeAgo: string;
  time: number;
  subdomains: SubdomainTransactionResult[];
};

export type BlockAggregatorResult = Omit<BlockchainInfoBlockResult, 'nameOperations'> & {
  nameOperations: BlockAggregatorNameOperationResult[];
};

class BlockAggregator extends AggregatorWithArgs<BlockAggregatorResult, BlockAggregatorOpts> {
  key(hash: BlockAggregatorOpts) {
    return `Block:${hash}`;
  }

  async setter(hash: BlockAggregatorOpts) {
    const blockchainInfoBlock = await fetchBlock(hash);
    if (!blockchainInfoBlock) {
      return null;
    }
    const { time } = blockchainInfoBlock;

    const nameOperations = await Promise.map(
      blockchainInfoBlock.nameOperations,
      async (_nameOp) => {
        try {
          const nameOp: BlockAggregatorNameOperationResult = { 
            ..._nameOp,
            timeAgo: moment(time * 1000).fromNow(true),
            time: time * 1000,
            subdomains: undefined
          };
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

    const block: BlockAggregatorResult = {
      ...blockchainInfoBlock,
      transactions: blockchainInfoBlock.transactions.slice(0, 10),
      nameOperations: nameOperations.filter(Boolean)
    };

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

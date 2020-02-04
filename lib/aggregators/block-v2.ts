import { Aggregator, AggregatorSetterResult } from './aggregator';
import {
  getBlock,
  getBlockTransactions,
  getBlockHash,
  BitcoreTransaction,
  BitcoreBlock,
  getTimeForBlockHeight
} from '../bitcore-db/queries';
import {
  getNameOperationsForBlock,
  Subdomain,
  NameOperationsForBlockResult
} from '../core-db-pg/queries';
import { btcValue } from '../utils';
import { getAddr } from '../btc-tx-decoder';


/** hashOrHeight */
type BlockAggregatorOpts = string;

export type HistoryInfoNameOp = NameOperationsForBlockResult & {
  timeAgo?: string;
  time?: number;
  subdomains?: Subdomain[];
}

export type BlockAggregatorResult = BitcoreBlock & {
  transactions: BitcoreTransaction[];
  nameOperations: {
    opcode: string;
    block_id: number;
    txid: string;
    name: string;
    owner: string;
    address: string;
    sender: string;
    time: number;
  }[];
  rewardFormatted: string;
};

class BlockAggregator extends Aggregator<BlockAggregatorResult, BlockAggregatorOpts> {
  key(hashOrHeight: BlockAggregatorOpts) {
    return `Block:${hashOrHeight}`;
  }

  async setter(hashOrHeight: BlockAggregatorOpts): Promise<AggregatorSetterResult<BlockAggregatorResult>> {
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

    const blockTime = await getTimeForBlockHeight(block.height);
    const nameOperations = await getNameOperationsForBlock(block.height);
    const nameOpsResult = nameOperations.map(n => {
      return {
        opcode: n.opcode,
        block_id: n.block_id,
        txid: n.txid,
        name: n.name,
        owner: n.owner,
        address: n.address,
        sender: getAddr(Buffer.from(n.sender, 'hex')),
        time: blockTime,
      };
    });

    const rewardFormatted = btcValue(block.reward, true);

    const result = {
      ...block,
      nameOperations: nameOpsResult,
      transactions,
      rewardFormatted
    };
    return {
      shouldCacheValue: true,
      value: result,
    };
  }

  expiry() {
    return 60 * 60 * 24 * 2; // 2 days
  }
}

export default new BlockAggregator();

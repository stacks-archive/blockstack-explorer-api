import * as moment from 'moment';
import { getDB } from './index';
import { HistoryInfoNameOp } from '../aggregators/block-v2';

enum Collections {
  Blocks = 'blocks',
  Transactions = 'transactions'
}

const chainQuery = {
  network: 'mainnet',
  chain: 'BTC'
};

export type BitcoreBlock = {
  bits: number;
  chain: string;
  hash: string;
  height: number;
  merkleRoot: string;
  network: string;
  nextBlockHash: string;
  nonce: number;
  previousBlockHash: string;
  processed: boolean;
  reward: number;
  size: number;
  time: Date;
  timeNormalized: Date;
  transactionCount: number;
  version: number;
}

export type Block = Omit<BitcoreBlock, 'time'> & {
  time: number;
  date: string;
  nameOperations?: HistoryInfoNameOp[];
  txCount?: number;
  transactions?: BitcoreTransaction[];
  rewardFormatted?: string;
};

export const getBlocks = async (date: string, page = 0): Promise<Block[]> => {
  const db = await getDB();
  const collection = db.collection<BitcoreBlock>(Collections.Blocks);
  const dateQuery = moment(date).utc();
  const beginning = dateQuery.startOf('day');
  const end = moment(beginning).endOf('day');
  const blocksResult = await collection
    .find({
      time: {
        $lte: end.toDate(),
        $gte: beginning.toDate()
      },
      ...chainQuery
    })
    .limit(100)
    .sort({ height: -1 })
    .skip(page * 100)
    .toArray();

  const blocks: Block[] = blocksResult.map(block => ({
    ...block,
    time: block.time.getTime() / 1000,
    date: block.time.toISOString(),
    txCount: block.transactionCount
  }));

  return blocks;
};

export const getBlock = async (hash: string): Promise<Block> => {
  const db = await getDB();
  const collection = db.collection<BitcoreBlock>(Collections.Blocks);
  const blockResult = await collection.findOne({
    hash
  });
  const block: Block = {
    ...blockResult,
    time: blockResult.time.getTime() / 1000,
    date: blockResult.time.toISOString(),
    txCount: blockResult.transactionCount
  };

  return block;
};

export const getBlockByHeight = async (height: number): Promise<Block> => {
  const db = await getDB();
  const collection = db.collection<BitcoreBlock>(Collections.Blocks);
  const blockResult = await collection.findOne({
    height
  });
  const block: Block = {
    ...blockResult,
    time: blockResult.time.getTime() / 1000,
    date: blockResult.time.toISOString(),
    txCount: blockResult.transactionCount
  };

  return block;
};

export const getBlockTransactions = async (
  hash: string
): Promise<BitcoreTransaction[]> => {
  const db = await getDB();
  const txCollection = db.collection<BitcoreTransaction>(Collections.Transactions);
  const txResults = await txCollection
    .find({
      blockHash: hash
    })
    .limit(10)
    .toArray();

  return txResults;
};

export type BitcoreTransaction = {
  txid: string;
  blockHeight: number;
  blockHash: string;
  blockTime: string;
  coinbase: boolean;
  fee: number;
  size: number;
  inputCount: number;
  outputCount: number;
  value: number;
};

export const getTX = async (txid: string): Promise<BitcoreTransaction> => {
  const db = await getDB();
  const collection = db.collection<BitcoreTransaction>(Collections.Transactions);
  const tx = await collection.findOne({
    txid,
    ...chainQuery
  });
  return tx;
};

export const getBlockHash = async (height: string): Promise<string> => {
  const db = await getDB();
  const collection = db.collection<BitcoreBlock>(Collections.Blocks);
  const block = await collection.findOne({
    height: parseInt(height, 10),
    ...chainQuery
  });
  return block.hash;
};

export const getLatestBlock = async (): Promise<Block> => {
  const db = await getDB();
  const collection = db.collection<BitcoreBlock>(Collections.Blocks);
  const blockResult = await collection.findOne({}, { sort: { height: -1 } });
  const block: Block = {
    ...blockResult,
    time: blockResult.time.getTime() / 1000,
    date: blockResult.time.toISOString(),
    txCount: blockResult.transactionCount
  };
  return block;
};

export const getTimeForBlock = async (height: number): Promise<number> => {
  const block = await getBlockByHeight(height);
  return new Date(block.date).getTime();
};

export const getTimesForBlockHeights = async (
  heights: number[]
): Promise<Record<number, number>> => {
  const db = await getDB();
  const collection = db.collection<BitcoreBlock>(Collections.Blocks);
  const blocks = await collection
    .find({
      height: {
        $in: heights
      }
    })
    .toArray();
  const timesByHeight: Record<number, number> = {};
  blocks.forEach(block => {
    timesByHeight[block.height] = block.time.getTime();
  });
  return timesByHeight;
};

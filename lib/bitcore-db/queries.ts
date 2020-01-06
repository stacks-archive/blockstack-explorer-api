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

export type Block = {
  nextBlockHash: string;
  previousBlockHash: string;
  merkleRoot: string;
  time: number;
  date: string;
  bits: number;
  nonce: number;
  size: number;
  transactionCount: number;
  reward: number;
  height: number;
  hash: string;
  nameOperations?: HistoryInfoNameOp[];
  txCount: number;
  transactions?: BitCoreTransaction[];
  rewardFormatted?: string;
};

export const getBlocks = async (date: string, page = 0): Promise<Block[]> => {
  const db = await getDB();
  const collection = db.collection(Collections.Blocks);
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
  const collection = db.collection(Collections.Blocks);
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
  const collection = db.collection(Collections.Blocks);
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
  hash: string,
  page = 0
): Promise<BitCoreTransaction[]> => {
  const db = await getDB();
  const txCollection = db.collection(Collections.Transactions);
  const txResults: BitCoreTransaction[] = await txCollection
    .find({
      blockHash: hash
    })
    .limit(10)
    .toArray();

  return txResults;
};

export type BitCoreTransaction = {
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

export const getTX = async (txid: string): Promise<BitCoreTransaction> => {
  const db = await getDB();
  const collection = db.collection(Collections.Transactions);
  const tx: BitCoreTransaction | null = await collection.findOne({
    txid,
    ...chainQuery
  });
  return tx;
};

export const getBlockHash = async (height: string): Promise<string> => {
  const db = await getDB();
  const collection = db.collection(Collections.Blocks);
  const block = await collection.findOne({
    height: parseInt(height, 10),
    ...chainQuery
  });
  return block.hash;
};

export const getLatestBlock = async (): Promise<Block> => {
  const db = await getDB();
  const collection = db.collection(Collections.Blocks);
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

export const getTimesForBlockHeights = async (heights: number[]) => {
  const db = await getDB();
  // TODO: create type def
  const collection = db.collection(Collections.Blocks);
  const blocks = await collection
    .find({
      height: {
        $in: heights
      }
    })
    .toArray();
  const timesByHeight: Record<number, number> = {};
  blocks.forEach(block => {
    timesByHeight[parseInt(block.height, 10)] = parseInt(block.time.getTime(), 10);
  });
  return timesByHeight;
};

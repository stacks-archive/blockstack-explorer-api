import moment from 'moment';
import { getDB } from './index';

enum Collections {
  Blocks = 'blocks',
  Transactions = 'transactions',
}

const chainQuery = {
  network: 'mainnet',
  chain: 'BTC',
};

export interface Block {
  nextBlockHash: string,
  previousBlockHash: string,
  merkleRoot: string,
  time: number,
  date: Date,
  bits: number,
  nonce: number,
  size: number,
  transactionCount: number,
  reward: number,
  height: number,
  hash: string,
  nameOperations?: any[],
  txCount: number,
  transactions?: Transaction[],
  rewardFormatted?: string,
}

export const getBlocks = async (date: string, page = 0): Promise<Block[]> => {
  const db = await getDB();
  const collection = db.collection(Collections.Blocks);
  const dateQuery = moment(date).utc();
  const beginning = dateQuery.startOf('day');
  const end = moment(beginning).endOf('day');
  const blocksResult = await collection.find({
    time: {
      $lte: end.toDate(),
      $gte: beginning.toDate(),
    },
    ...chainQuery,
  })
    .limit(100)
    .sort({ height: -1 })
    .skip(page * 100)
    .toArray();

  const blocks: Block[] = blocksResult.map(block => ({
    ...block,
    date: block.time,
    txCount: block.transactionCount,
  }));

  return blocks;
};

export const getBlock = async (hash: string): Promise<Block> => {
  const db = await getDB();
  const collection = db.collection(Collections.Blocks);
  const blockResult = await collection.findOne({
    hash,
  });
  const block: Block = {
    ...blockResult,
    time: blockResult.time.getTime() / 1000,
    date: blockResult.time,
    txCount: blockResult.transactionCount,
  };

  return <Block>block;
};

export const getBlockByHeight = async (height: number): Promise<Block> => {
  const db = await getDB();
  const collection = db.collection(Collections.Blocks);
  const blockResult = await collection.findOne({
    height,
  });
  const block: Block = {
    ...blockResult,
    time: blockResult.time.getTime() / 1000,
    date: blockResult.time,
    txCount: blockResult.transactionCount,
  };

  return <Block>block;
};

export const getBlockTransactions = async (hash: string, page = 0): Promise<Transaction[]> => {
  const db = await getDB();
  const txCollection = db.collection(Collections.Transactions);
  const txResults: Transaction[] = await txCollection.find({
    blockHash: hash,
  }).limit(10).toArray();

  return txResults;
};

export interface Transaction {
  txid: string,
  blockHeight: number,
  blockHash: string,
  blockTime: Date,
  coinbase: boolean,
  fee: number,
  size: number,
  inputCount: number,
  outputCount: number,
  value: number,
}

export const getTX = async (txid: string): Promise<Transaction> => {
  const db = await getDB();
  const collection = db.collection(Collections.Transactions);
  const tx: Transaction | null = await collection.findOne({
    txid,
    ...chainQuery,
  });
  return <Transaction>tx;
};

export const getBlockHash = async (height: string): Promise<string> => {
  const db = await getDB();
  const collection = db.collection(Collections.Blocks);
  const block = await collection.findOne({
    height: parseInt(height, 10),
    ...chainQuery,
  });
  return block.hash;
};

export const getLatestBlock = async (): Promise<Block> => {
  const db = await getDB();
  const collection = db.collection(Collections.Blocks);
  const block = await collection.findOne({}, { sort: { height: -1 } });
  return <Block>block;
};

export const getTimeForBlock = async (height: number): Promise<number> => {
  const block = await getBlockByHeight(height);
  return block.date.getTime();
};

export const getTimesForBlockHeights = async (heights: number[]) => {
  const db = await getDB();
  const collection = db.collection(Collections.Blocks);
  const blocks = await collection.find({
    height: {
      $in: heights,
    },
  }).toArray();
  const timesByHeight = {};
  blocks.forEach((block) => { timesByHeight[block.height] = block.time.getTime(); });
  return timesByHeight;
};

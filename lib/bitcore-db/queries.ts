import * as moment from 'moment';
import { getDB } from './index';
import { HistoryInfoNameOp } from '../aggregators/block-v2';

enum Collections {
  Blocks = 'blocks',
  Transactions = 'transactions',
  Events = 'events',
  Coins = 'coins'
}

const chainQuery = {
  network: 'mainnet',
  chain: 'BTC'
};

export type BitcoreBlockQueryResult = {
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

export type BitcoreBlock = Omit<BitcoreBlockQueryResult, 'time'> & {
  time: number;
  date: string;
  txCount: number;
};

export type BitcoreAddressTx = {
  address: string;
  chain: string;
  coinbase: boolean;
  mintHeight: number;
  mintIndex: number;
  mintTxid: string;
  network: string;
  script: { 
    buffer: Buffer; 
  };
  spentHeight: number;
  value: number;
};

export const getAddressTransactions = async (address: string, page = 0, count = 20): Promise<BitcoreAddressTx[]> => {
  const db = await getDB();
  const collection = db.collection<BitcoreAddressTx>(Collections.Coins);
  const txResult = await collection
    .find({
      address,
      ...chainQuery
    })
    .limit(count)
    .sort({ mintHeight: -1 })
    .skip(page * count)
    .toArray();
  return txResult;
};

export type BitcoreAddressBalanceResult = {
  confirmed: number; 
  unconfirmed: number; 
  balance: number;
};

export const getAddressBtcBalance = async (address: string): Promise<BitcoreAddressBalanceResult> => {
  const db = await getDB();

  // minted by a transaction which can no longer confirm.
  const conflicting = -3;

  const collection = db.collection<BitcoreAddressTx>(Collections.Coins);
  const result = await collection.aggregate<{ _id: string; balance: number }>(
    [
      {
        $match: {
          address,
          ...chainQuery,
          spentHeight: { $lt: 0 },
          mintHeight: { $gt: conflicting }
        }
      },
      {
        $project: {
          value: 1,
          status: {
            $cond: {
              if: { $gte: ['$mintHeight', 0] },
              then: 'confirmed',
              else: 'unconfirmed'
            }
          },
          _id: 0
        }
      },
      {
        $group: {
          _id: '$status',
          balance: { $sum: '$value' }
        }
      }
    ]
  ).toArray();

  const totals = result.reduce<BitcoreAddressBalanceResult>(
    (acc, cur) => {
      if (cur._id === 'unconfirmed') {
        acc.unconfirmed += cur.balance;
      } else if (cur._id === 'confirmed') {
        acc.confirmed += cur.balance;
      }
      acc.balance += cur.balance;
      return acc;
    },
    { confirmed: 0, unconfirmed: 0, balance: 0 }
  );
  return totals;
};

export const getBlocks = async (date: string, page = 0): Promise<BitcoreBlock[]> => {
  const db = await getDB();
  const collection = db.collection<BitcoreBlockQueryResult>(Collections.Blocks);
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

  const blocks: BitcoreBlock[] = blocksResult.map(block => ({
    ...block,
    time: block.time.getTime() / 1000,
    date: block.time.toISOString(),
    txCount: block.transactionCount
  }));

  return blocks;
};

export const getBlock = async (hash: string): Promise<BitcoreBlock> => {
  const db = await getDB();
  const collection = db.collection<BitcoreBlockQueryResult>(Collections.Blocks);
  const blockResult = await collection.findOne({
    hash
  });
  const block: BitcoreBlock = {
    ...blockResult,
    time: blockResult.time.getTime() / 1000,
    date: blockResult.time.toISOString(),
    txCount: blockResult.transactionCount
  };

  return block;
};

export const getBlockByHeight = async (height: number): Promise<BitcoreBlock> => {
  const db = await getDB();
  const collection = db.collection<BitcoreBlockQueryResult>(Collections.Blocks);
  const blockResult = await collection.findOne({
    height
  });
  const block: BitcoreBlock = {
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
  const txCollection = db.collection<BitcoreTransactionQueryResult>(Collections.Transactions);
  const txResults = await txCollection
    .find({
      blockHash: hash
    })
    .limit(10)
    .toArray();
  const result = txResults.map(tx => ({
    ...tx,
    blockTime: tx.blockTime.toISOString()
  }));
  return result;
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

type BitcoreTransactionQueryResult = {
  txid: string;
  blockHeight: number;
  blockHash: string;
  blockTime: Date;
  coinbase: boolean;
  fee: number;
  size: number;
  inputCount: number;
  outputCount: number;
  value: number;
};

export const getTX = async (txid: string): Promise<BitcoreTransaction> => {
  const db = await getDB();
  const collection = db.collection<BitcoreTransactionQueryResult>(Collections.Transactions);
  const tx = await collection.findOne({
    txid,
    ...chainQuery
  });
  const result: BitcoreTransaction = {
    ...tx,
    blockTime: tx.blockTime.toISOString()
  } 
  return result;
};

export const getBlockHash = async (height: string): Promise<string> => {
  const db = await getDB();
  const collection = db.collection<BitcoreBlockQueryResult>(Collections.Blocks);
  const block = await collection.findOne({
    height: parseInt(height, 10),
    ...chainQuery
  });
  return block.hash;
};

export const getLatestBlock = async (): Promise<BitcoreBlock> => {
  const db = await getDB();
  const collection = db.collection<BitcoreBlockQueryResult>(Collections.Blocks);
  const blockResult = await collection.findOne({
    ...chainQuery,
    processed: true,
  }, { sort: { height: -1 } });
  const block: BitcoreBlock = {
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
  const collection = db.collection<BitcoreBlockQueryResult>(Collections.Blocks);
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

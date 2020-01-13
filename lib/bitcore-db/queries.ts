import * as moment from 'moment';
import { getDB } from './index';

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

// eslint-disable-next-line max-len
// From: https://github.com/bitpay/bitcore/blob/67427b5874600736c1c8fcd13b571b6dfbd70774/packages/bitcore-node/src/types/Coin.d.ts#L26
const enum BitcoreSpentHeightIndicators {
  /** The value below which numbers are simply used as indicators. */
  minimum = 0,
  /** The coin is spent by a transaction currently in the mempool but not yet included in a block. */
  pending = -1,
  /** The coin is unspent, and no transactions spending it have been seen. */
  unspent = -2,
  /** The coin was minted by a transaction which can no longer confirm. */
  conflicting = -3,
  /** An internal error occurred. (The database appears to be inconsistent.) */
  error = -4
}

type BlockQueryResult = {
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

export type BitcoreBlock = {
  hash: string;
  height: number;
  time: number;
  size: number;
  txCount: number;
  reward: number;
};

function parseBlockQueryResult(result: BlockQueryResult): BitcoreBlock {
  return {
    hash: result.hash,
    height: result.height,
    time: Math.round(result.time.getTime() / 1000),
    size: result.size,
    txCount: result.transactionCount,
    reward: result.reward,
  };
}

function parseTransactionQueryResult(
  result: TransactionAggregatedQueryResult, 
  tipHeight: number
): BitcoreTransaction {
  const tx: BitcoreTransaction = {
    txid: result.txid,
    blockHeight: result.blockHeight,
    blockHash: result.blockHash,
    blockTime: Math.round(result.blockTime.getTime() / 1000),
    confirmations: tipHeight - result.blockHeight + 1,
    value: result.value,
    fee: result.fee,
    size: result.size,
    inputs: result.txInputs.map(tx => ({
      address: tx.address === 'false' ? false : tx.address,
      value: tx.value
    })),
    outputs: result.txOutputs.map(tx => ({
      address: tx.address === 'false' ? false : tx.address,
      script: tx.script.buffer.toString('base64'),
      value: tx.value
    }))
  };
  return tx;
}

type CoinsQueryResult = {
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

export type BitcoreTransaction = {
  blockHeight: number;
  blockHash: string;
  blockTime: number;
  confirmations: number;
  txid: string;
  value: number;
  fee: number;
  size: number;
  inputs: {
    address: string | false;
    value: number;
  }[];
  outputs: {
    address: string | false; 
    value: number;
    /** base64 string */
    script: string;
  }[];
};

export type BitcoreAddressTxInfo = BitcoreTransaction & {
  address: string;
  totalTransferred: number;
  action: 'sent' | 'received';
};

type AddressTxInfoQueryResult = CoinsQueryResult & {
  mintTx: TransactionQueryResult;
  spentTx?: TransactionQueryResult;
  txOutputs: CoinsQueryResult[];
};

export const getAddressTransactions = async (
  address: string, page = 0, count = 20
): Promise<BitcoreAddressTxInfo[]> => {
  if (!count) {
    count = 20;
  }
  const tip = await getLatestBlockHeight();
  const db = await getDB();
  const collection = db.collection<AddressTxInfoQueryResult>(Collections.Coins);
  const result = await collection
    .aggregate([
      {
        $match: {
          address,
          ...chainQuery
        },
      },
      {
        $lookup: {
          from: Collections.Transactions,
          localField: 'mintTxid',
          foreignField: 'txid',
          as: 'mintTx'
        }
      },
      {
        $unwind: {
          path: "$mintTx",
          preserveNullAndEmptyArrays: true,
        }
      },
      {
        $lookup: {
          from: Collections.Transactions,
          localField: 'spentTxid',
          foreignField: 'txid',
          as: 'spentTx'
        }
      },
      {
        $unwind: {
          path: "$spentTx",
          preserveNullAndEmptyArrays: true,
        }
      },
      {
        $lookup: {
          from: Collections.Coins,
          localField: 'spentTxid',
          foreignField: 'mintTxid',
          as: 'txOutputs'
        }
      },
    ])
    .sort({ mintHeight: -1 })
    .skip(page * count)
    .limit(count)
    .toArray();

  const txs = result.map(tx => {
    const isSpend = !!tx.spentTx;
    const result: BitcoreAddressTxInfo = {
      address: tx.address,
      action: isSpend ? 'sent' : 'received',
      totalTransferred: isSpend ? tx.spentTx.value : tx.mintTx.value,
      size: isSpend ? tx.spentTx.size : tx.mintTx.size,
      value: tx.value,
      blockHeight: tx.mintHeight,
      blockHash: tx.mintTx.blockHash,
      confirmations: tip - tx.mintTx.blockHeight + 1,
      blockTime: Math.round(tx.mintTx.blockTime.getTime() / 1000),
      txid: tx.mintTxid,
      fee: tx.mintTx.fee,
      inputs: [],
      outputs: isSpend ? tx.txOutputs.map(tx => ({
        address: tx.address === 'false' ? false : tx.address,
        script: tx.script.buffer.toString('base64'),
        value: tx.value
      })) : []
    };
    return result;
  });

  return txs;
};


export type BitcoreAddressBalance = {
  balance: number; 
  totalReceived: number; 
  totalSent: number;
  totalTransactions: number;
};

export const getAddressBtcBalance = async (address: string): Promise<BitcoreAddressBalance> => {
  const db = await getDB();

  const collection = db.collection<CoinsQueryResult>(Collections.Coins);
  const result = await collection.aggregate<{ _id: string; balance: number; count: number }>(
    [
      {
        $match: {
          address,
          ...chainQuery,
          // spentHeight: { $lt: BitcoreSpentHeightIndicators.minimum },
          mintHeight: { $gte: BitcoreSpentHeightIndicators.minimum }
        }
      },
      {
        $project: {
          value: 1,
          status: {
            $cond: {
              if: { $gte: ['$spentHeight', 0] },
              then: 'spent',
              else: 'unspent'
            }
          },
          _id: 0,
        }
      },
      {
        $group: {
          _id: '$status',
          balance: { $sum: '$value' },
          count: { $sum: 1 },
        }
      }
    ]
  ).toArray();

  const totals = result.reduce<BitcoreAddressBalance>(
    (acc, cur) => {
      if (cur._id === 'unspent') {
        acc.balance += cur.balance;
      } else if (cur._id === 'spent') {
        acc.totalSent += cur.balance;
      }
      acc.totalReceived += cur.balance;
      acc.totalTransactions += cur.count;
      return acc;
    },
    { balance: 0, totalReceived: 0, totalSent: 0, totalTransactions: 0 }
  );
  return totals;
};

export const getBlocks = async (date: string, page = 0): Promise<BitcoreBlock[]> => {
  const db = await getDB();
  const collection = db.collection<BlockQueryResult>(Collections.Blocks);
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

  const blocks = blocksResult.map(block => parseBlockQueryResult(block));
  return blocks;
};

export const getBlock = async (hash: string): Promise<BitcoreBlock> => {
  const db = await getDB();
  const collection = db.collection<BlockQueryResult>(Collections.Blocks);
  const blockResult = await collection.findOne({
    hash
  });
  const block = parseBlockQueryResult(blockResult);
  return block;
};

export const getBlockByHeight = async (height: number): Promise<BitcoreBlock> => {
  const db = await getDB();
  const collection = db.collection<BlockQueryResult>(Collections.Blocks);
  const blockResult = await collection.findOne({
    height
  });
  const block = parseBlockQueryResult(blockResult);
  return block;
};

export const getBlockTransactions = async (
  hash: string,
  page = 0,
  count = 20,
): Promise<BitcoreTransaction[]> => {
  const tip = await getLatestBlockHeight();
  const db = await getDB();
  const txCollection = db.collection<TransactionAggregatedQueryResult>(Collections.Transactions);
  const txResults = await txCollection
    .aggregate(createAggregateTxQuery({blockHash: hash}))
    .limit(count)
    .sort({ blockHeight: -1 })
    .skip(page * count)
    .toArray();

  const result = txResults.map(tx => parseTransactionQueryResult(tx, tip));
  return result;
};

type TransactionQueryResult = {
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

type TransactionAggregatedQueryResult = TransactionQueryResult & {
  txInputs: CoinsQueryResult[];
  txOutputs: CoinsQueryResult[];
};

const createAggregateTxQuery = (match: object) => {
  return [
    {
      $match: {
        ...chainQuery,
        ...match
      },
    },
    {
      $lookup: {
        from: Collections.Coins,
        localField: 'txid',
        foreignField: 'spentTxid',
        as: 'txInputs'
      }
    },
    {
      $lookup: {
        from: Collections.Coins,
        localField: 'txid',
        foreignField: 'mintTxid',
        as: 'txOutputs'
      }
    },
  ]
};

export const getTX = async (txid: string): Promise<BitcoreTransaction | null> => {
  const tip = await getLatestBlockHeight();
  const db = await getDB();
  const collection = db.collection<TransactionAggregatedQueryResult>(Collections.Transactions);
  const results = await collection
    .aggregate(createAggregateTxQuery({txid}))
    .limit(1)
    .toArray();

  if (!results || results.length === 0) {
    return null;
  }
  const result = results[0];
  const tx = parseTransactionQueryResult(result, tip);
  return tx;
};

/*
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
*/


export const getBlockHash = async (height: string): Promise<string> => {
  const db = await getDB();
  const collection = db.collection<BlockQueryResult>(Collections.Blocks);
  const block = await collection.findOne({
    height: parseInt(height, 10),
    ...chainQuery
  }, { 
    projection: { _id: 0, hash: 1 } 
  });
  return block.hash;
};

export const getLatestBlockHeight = async (): Promise<number> => {
  const db = await getDB();
  const collection = db.collection<BlockQueryResult>(Collections.Blocks);
  const blockResult = await collection.findOne({
    ...chainQuery,
    processed: true,
  }, { 
    projection: { _id: 0, height: 1 }, 
    sort: { height: -1 } 
  });
  return blockResult.height;
};

export const getLatestBlock = async (): Promise<BitcoreBlock> => {
  const db = await getDB();
  const collection = db.collection<BlockQueryResult>(Collections.Blocks);
  const blockResult = await collection.findOne({
    ...chainQuery,
    processed: true,
  }, { sort: { height: -1 } });
  const block = parseBlockQueryResult(blockResult);
  return block;
};

export const getTimesForBlockHeights = async (
  heights: number[]
): Promise<Record<number, number>> => {
  const db = await getDB();
  const collection = db.collection<BlockQueryResult>(Collections.Blocks);
  const blocks = await collection
    .find({
      height: {
        $in: heights
      }
    })
    .project({ _id: 0, height: 1, time: 1 })
    .toArray();
  const timesByHeight: Record<number, number> = {};
  blocks.forEach(block => {
    timesByHeight[block.height] = Math.round(block.time.getTime() / 1000);
  });
  return timesByHeight;
};

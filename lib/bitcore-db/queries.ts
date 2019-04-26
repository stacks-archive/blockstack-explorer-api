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

interface Block {
  nextBlockHash: string,
  previousBlockHash: string,
  merkleRoot: string,
  time: Date,
  bits: number,
  nonce: number,
  size: number,
  transactionCount: number,
  reward: number,
  height: number,
  hash: string,
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
  }).limit(100).skip(page * 100).toArray();

  const blocks: Block[] = blocksResult.map(block => ({
    ...block,
  }));

  return blocksResult;
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

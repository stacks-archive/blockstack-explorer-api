import BluebirdPromise from 'bluebird';
import * as c32check from 'c32check';
import { address } from 'bitcoinjs-lib';
import { getDB } from './index';
import { getLatestBlock } from '../bitcore-db/queries';

interface Subdomain {
  name: string,
  blockHeight: number | string,
  owner: string,
  [key: string]: any,
}

export const getRecentSubdomains = async (limit: number, page = 0): Promise<Subdomain[]> => {
  const sql = 'select * from subdomain_records ORDER BY block_height DESC LIMIT $1 OFFSET $2;';
  const params = [limit, page * limit];
  const db = await getDB();
  const res = await db.query(sql, params);
  const results: Subdomain[] = res.rows.map(row => ({
    ...row,
    name: row.fully_qualified_subdomain,
    blockHeight: parseInt(row.block_height, 10),
  }));
  return results;
};

interface NameRecord {
  name: string,
  preorderBlockHeight: number,
  address: string,
  firstRegistered: number,
  txid: string,
  [key: string]: any,
}

export const getRecentNames = async (limit: number, page = 0): Promise<NameRecord[]> => {
  const sql = 'select * from name_records ORDER BY block_number DESC LIMIT $1 OFFSET $2';
  const params = [limit, page * limit];
  // const rows = await getAll(DB.Blockstack, sql, params);
  const db = await getDB();
  const { rows } = await db.query(sql, params);
  const results: NameRecord[] = rows.map(row => ({
    ...row,
    name: row.name,
    preorderBlockHeight: row.preorder_block_number,
    txid: row.txid,
    firstRegistered: row.first_registered,
    address: row.address,
  }));
  return results;
};

// export const getStacksHolderCount = async (): Promise<number> => {
//   const sql = 'SELECT count(*) as count from accounts where (credit_value - debit_value) > 0;';
//   // const row = await get(DB.Blockstack, sql);
//   return <number>row.count;
// };

export interface StacksTransaction {
  txid: string,
  historyId: string,
  blockHeight: number,
  op: string,
  opcode: string,
  historyData: any,
  [key: string]: any,
}

export const getRecentStacksTransfers = async (limit: number, page = 0): Promise<StacksTransaction[]> => {
  const sql = "select * from history where opcode = 'TOKEN_TRANSFER' ORDER BY block_id DESC LIMIT $1 OFFSET $2;";
  const params = [limit, page * limit];
  // const rows = await getAll(DB.Blockstack, sql, params);
  const db = await getDB();
  const { rows } = await db.query(sql, params);
  const results: StacksTransaction[] = rows.map((row) => {
    let historyData;
    try {
      historyData = JSON.parse(row.history_data);
    } catch (error) {
      console.error('Error parsing history data', error);
    }
    return {
      ...row,
      txid: row.txid,
      historyId: row.history_id,
      blockHeight: row.block_id,
      op: row.op,
      opcode: row.opcode,
      historyData,
    };
  });
  return results;
};

export interface HistoryRecord {
  block_id: number,
  op: string,
  opcode: string,
  txid: string,
  history_id: string,
  creator_address: string | null,
  history_data: string,
  vtxindex: number,
  historyData: {
    [key: string]: any,
  }
}

export const getNameOperationsForBlock = async (
  blockHeight: number,
): Promise<HistoryRecord[]> => {
  const sql = "SELECT * FROM history WHERE opcode in ('NAME_UPDATE', 'NAME_REGISTRATION', 'NAME_PREORDER') AND block_id = $1";
  const params = [blockHeight];
  const db = await getDB();
  const { rows } = await db.query(sql, params);
  // const results = rows.map(row => ({
  //   ...row,
  //   historyData: JSON.parse(row.history_data),
  // }));
  const results: HistoryRecord[] = rows.map((row) => {
    const historyData = JSON.parse(row.history_data);
    return {
      ...row,
      ...historyData,
    };
  });
  return results;
};

export const getSubdomainRegistrationsForTxid = async (txid: string) => {
  const sql = 'SELECT * FROM subdomain_records WHERE txid = $1';
  const params = [txid];
  const db = await getDB();
  const { rows } = await db.query(sql, params);
  const results: Subdomain[] = rows.map(row => ({
    ...row,
    name: row.fully_qualified_subdomain,
    blockHeight: parseInt(row.block_height, 10),
  }));
  return results;
};

export const getAllNameOperations = async (): Promise<HistoryRecord[]> => {
  const sql = "SELECT * FROM history WHERE opcode in ('NAME_UPDATE', 'NAME_REGISTRATION', 'NAME_PREORDER') ORDER BY block_id DESC LIMIT 100";
  const db = await getDB();
  const { rows } = await db.query(sql);
  return rows as HistoryRecord[];
};

export interface HistoryRecordWithSubdomains extends HistoryRecord {
  subdomains?: string[],
}

export const getAllHistoryRecords = async (limit: number, page = 0) => {
  const sql = "select * from history WHERE opcode in ('NAME_UPDATE', 'NAME_REGISTRATION', 'NAME_PREORDER', 'TOKEN_TRANSFER') ORDER BY block_id DESC LIMIT $1 OFFSET $2";
  const params = [limit, limit * page];
  const db = await getDB();
  const { rows } = await db.query(sql, params);
  const results: HistoryRecordWithSubdomains[] = await BluebirdPromise.map(rows as HistoryRecord[], async (row) => {
    const historyData = JSON.parse(row.history_data);
    if (row.opcode === 'NAME_UPDATE') {
      const subdomains = await getSubdomainRegistrationsForTxid(row.txid);
      return {
        ...row,
        historyData,
        subdomains: subdomains.map(sub => sub.name),
      };
    }
    return {
      ...row,
      historyData,
    };
  });
  return results;
};

export const getNameHistory = async (name: string) => {
  const sql = 'select * from history WHERE history_id = $1 ORDER BY block_id DESC';
  const params = [name];
  const db = await getDB();
  const { rows } = await db.query(sql, params);
  const results: HistoryRecord[] = rows.map((row) => {
    const historyData = JSON.parse(row.history_data);
    return {
      ...historyData,
      ...row,
    };
  });
  return results;
};

export const getVestingTotalForAddress = async (_address: string) => {
  try {
    const addr: string = c32check.c32ToB58(_address);
    const sql = 'SELECT * FROM account_vesting WHERE address = $1';
    const params = [addr];
    const db = await getDB();
    const { rows } = await db.query(sql, params);
    const vestingTotal: number = rows.reduce((prev, row) => {
      const vestAtBlock: string = row.vesting_value;
      return prev + parseInt(vestAtBlock, 10);
    }, 0);
    return vestingTotal;
  } catch (error) {
    console.log('vesting total query error', error);
    return 0;
  }
};

export const getUnlockedSupply = async () => {
  const latestBlock = await getLatestBlock();
  const sql = 'SELECT sum(vesting_value::bigint) FROM account_vesting where block_id < $1;';
  const db = await getDB();
  const params = [latestBlock.height];
  const { rows } = await db.query(sql, params);
  const [row] = rows;
  return row.sum * 10e-7;
};

export const getHistoryFromTxid = async (txid: string): Promise<HistoryRecord | null> => {
  const sql = 'SELECT * from history where txid = $1';
  const params = [txid];
  const db = await getDB();
  const { rows }: { rows: HistoryRecord[] } = await db.query(sql, params);
  const [row] = rows;
  if (!row) return null;
  return {
    ...row,
    historyData: JSON.parse(row.history_data),
  };
};

export const getAddressSTXTransactions = async (btcAddress: string): Promise<HistoryRecord[]> => {
  const sql = 'SELECT * from history where history_data LIKE $1 order by block_id DESC, vtxindex DESC LIMIT 50';
  const params = [`%${btcAddress}%`];
  const db = await getDB();
  const { rows } = await db.query(sql, params);
  const history: HistoryRecord[] = rows.map(row => ({
    ...row,
    historyData: JSON.parse(row.history_data),
  }));
  return history;
};

interface Vesting {
  totalUnlocked: number
  totalLocked: number
  vestingTotal: number
}

interface AccountVesting {
  address: string
  vesting_value: string
  block_id: number
}

export const getAccountVesting = async (btcAddress: string): Promise<AccountVesting[]> => {
  const sql = 'SELECT * FROM account_vesting where address = $1 ORDER BY block_id ASC;';
  const db = await getDB();
  const params = [btcAddress];
  const { rows }: { rows: AccountVesting[] } = await db.query(sql, params);
  return rows;
};

export const getVestingForAddress = async (btcAddress: string): Promise<Vesting> => {
  const latestBlock = await getLatestBlock();
  const rows = await getAccountVesting(btcAddress);
  let totalUnlocked = 0;
  let totalLocked = 0;
  let vestingTotal = 0;
  rows.forEach((row) => {
    const value = parseInt(row.vesting_value, 10);
    vestingTotal += value;
    if (row.block_id <= latestBlock.height) {
      totalUnlocked += value;
    } else {
      totalLocked += value;
    }
  });
  return {
    totalUnlocked,
    totalLocked,
    vestingTotal,
  };
};

interface Account {
  credit_value: string
}

export const getTokensGrantedInHardFork = async (btcAddress: string): Promise<number> => {
  const sql = 'SELECT * FROM blockstack_core.accounts where address = $1 and block_id = 373601 LIMIT 10;';
  const db = await getDB();
  const params = [btcAddress];
  const { rows }: { rows: Account[] } = await db.query(sql, params);
  let total = 0;
  rows.forEach((row) => { total += parseInt(row.credit_value, 10); });
  return total;
};

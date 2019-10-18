import BluebirdPromise from 'bluebird';
import * as c32check from 'c32check';
import { getDB } from './index';

interface Subdomain {
  name: string,
  blockHeight: number | string,
  owner: string,
  [key: string]: any,
}

export const getRecentSubdomains = async (limit: number, page: number = 0): Promise<Subdomain[]> => {
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

export const getRecentNames = async (limit: number, page: number = 0): Promise<NameRecord[]> => {
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

export const getRecentStacksTransfers = async (limit: number, page: number = 0): Promise<StacksTransaction[]> => {
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

interface HistoryRecord {
  block_id: number,
  op: string,
  opcode: string,
  txid: string,
  history_id: string,
  creator_address: string | null,
  history_data: string,
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
  return <HistoryRecord[]>rows;
};

export interface HistoryRecordWithSubdomains extends HistoryRecord {
  subdomains?: string[],
}

export const getAllHistoryRecords = async (limit: number, page: number = 0) => {
  const sql = "select * from history WHERE opcode in ('NAME_UPDATE', 'NAME_REGISTRATION', 'NAME_PREORDER', 'TOKEN_TRANSFER') ORDER BY block_id DESC LIMIT $1 OFFSET $2";
  const params = [limit, limit * page];
  const db = await getDB();
  const { rows } = await db.query(sql, params);
  const results: HistoryRecordWithSubdomains[] = await BluebirdPromise.map(<HistoryRecord[]>rows, async (row) => {
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
  const results: HistoryRecord[] = await rows.map((row) => {
    const historyData = JSON.parse(row.history_data);
    return {
      ...historyData,
      ...row,
    };
  });
  return results;
};

export const getVestingTotalForAddress = async (address: string) => {
  try {
    const addr: string = c32check.c32ToB58(address);
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

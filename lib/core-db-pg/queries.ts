import * as BluebirdPromise from 'bluebird';
import * as c32check from 'c32check';
import { address } from 'bitcoinjs-lib';
import BigNumber from 'bignumber.js';
import { getDB } from './index';
import { getLatestBlock } from '../bitcore-db/queries';
import { HistoryDataEntry, HistoryDataNameUpdate, HistoryDataNameRegistration, HistoryDataNamePreorder } from './history-data-types';

export type Subdomain = SubdomainRecordQueryResult & {
  name: string;
  blockHeight: number;
  owner: string;
};

export type SubdomainRecordQueryResult = {
  fully_qualified_subdomain: string;
  text: string;
  sequence: string;
  owner: string;
  zonefile_hash: string;
  signature: string;
  block_height: string;
  parent_zonefile_hash: string;
  parent_zonefile_index: string;
  zonefile_offset: string;
  txid: string;
  missing: string;
  accepted: string;
  resolver: string | null;
};

export const getRecentSubdomains = async (limit: number, page = 0): Promise<Subdomain[]> => {
  const sql = 'select * from subdomain_records ORDER BY block_height DESC LIMIT $1 OFFSET $2;';
  const params = [limit, page * limit];
  const db = await getDB();
  const { rows }: { rows: SubdomainRecordQueryResult[] } = await db.query(sql, params);
  const results: Subdomain[] = rows.map(row => ({
    ...row,
    name: row.fully_qualified_subdomain,
    blockHeight: parseInt(row.block_height, 10)
  }));
  return results;
};

export type NameRecord = NameRecordQueryResult & {
  name: string;
  preorderBlockHeight: number;
  address: string;
  firstRegistered: number;
  txid: string;
};

export type NameRecordQueryResult = { 
  name: string;
  preorder_hash: string;
  name_hash128: string;
  namespace_id: string;
  namespace_block_number: number;
  value_hash: string;
  sender: string;
  sender_pubkey: string | null;
  address: string;
  block_number: number;
  preorder_block_number: number;
  first_registered: number;
  last_renewed: number;
  revoked: number;
  op: string;
  txid: string;
  vtxindex: number;
  op_fee: number;
  importer: string;
  importer_address: string | null;
  consensus_hash: string | null;
  token_fee: string;
  last_creation_op: string;
};

export const getRecentNames = async (limit: number, page = 0): Promise<NameRecord[]> => {
  const sql = 'select * from name_records ORDER BY block_number DESC LIMIT $1 OFFSET $2';
  const params = [limit, page * limit];
  // const rows = await getAll(DB.Blockstack, sql, params);
  const db = await getDB();
  const { rows } = await db.query(sql, params);
  const nameRows: NameRecordQueryResult[] = rows;
  const results: NameRecord[] = nameRows.map(row => ({
    ...row,
    name: row.name,
    preorderBlockHeight: row.preorder_block_number,
    txid: row.txid,
    firstRegistered: row.first_registered,
    address: row.address
  }));
  return results;
};

// export const getStacksHolderCount = async (): Promise<number> => {
//   const sql = 'SELECT count(*) as count from accounts where (credit_value - debit_value) > 0;';
//   // const row = await get(DB.Blockstack, sql);
//   return <number>row.count;
// };

export type StacksTransaction = {
  txid: string;
  historyId: string;
  blockHeight: number;
  op: string;
  opcode: string;
  historyData: HistoryDataEntry;
};

export const getRecentStacksTransfers = async (limit: number, page = 0): Promise<StacksTransaction[]> => {
  const sql = "select * from history where opcode = 'TOKEN_TRANSFER' ORDER BY block_id DESC LIMIT $1 OFFSET $2;";
  const params = [limit, page * limit];
  // const rows = await getAll(DB.Blockstack, sql, params);
  const db = await getDB();
  const { rows } = await db.query(sql, params);
  const historyRows: HistoryRecordQueryRow[] = rows;
  const results: StacksTransaction[] = historyRows.map(row => {
    let historyData: HistoryDataEntry;
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
      historyData
    };
  });
  return results;
};

export type HistoryRecordQueryRow = {
  block_id: number;
  op: string;
  opcode: string;
  txid: string;
  history_id: string;
  creator_address: string | null;
  history_data: string;
  vtxindex: number;
  value_hash: string | null;
}

export type NameOperationsForBlockResult = HistoryRecordQueryRow & (
  HistoryDataNameUpdate | 
  HistoryDataNameRegistration | 
  HistoryDataNamePreorder
);

export const getNameOperationsForBlock = async (
  blockHeight: number
): Promise<NameOperationsForBlockResult[]> => {
  const sql =
    "SELECT * FROM history WHERE opcode in ('NAME_UPDATE', 'NAME_REGISTRATION', 'NAME_PREORDER') AND block_id = $1";
  const params = [blockHeight];
  const db = await getDB();
  const { rows } = await db.query(sql, params);
  const historyRows: HistoryRecordQueryRow[] = rows;
  const results = historyRows.map(row => {
    const historyData: (
      HistoryDataNameUpdate | 
      HistoryDataNameRegistration | 
      HistoryDataNamePreorder) = JSON.parse(row.history_data);
    return {
      ...row,
      ...historyData
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
    blockHeight: parseInt(row.block_height, 10)
  }));
  return results;
};

export const getAllNameOperations = async (): Promise<HistoryRecordQueryRow[]> => {
  const sql =
    `SELECT * FROM history 
    WHERE opcode in ('NAME_UPDATE', 'NAME_REGISTRATION', 'NAME_PREORDER') 
    ORDER BY block_id DESC LIMIT 100`;
  const db = await getDB();
  const { rows } = await db.query(sql);
  const historyRows: HistoryRecordQueryRow[] = rows;
  return historyRows;
};

export type HistoryRecordResult = (HistoryRecordQueryRow & { 
  historyData: HistoryDataEntry; 
  subdomains?: string[];
});

export const getAllHistoryRecords = async (limit: number, page = 0): Promise<HistoryRecordResult[]> => {
  const sql = 
    `select * from history 
    WHERE opcode in ('NAME_UPDATE', 'NAME_REGISTRATION', 'NAME_PREORDER', 'TOKEN_TRANSFER')  
    ORDER BY block_id DESC LIMIT $1 OFFSET $2`;
  const params = [limit, limit * page];
  const db = await getDB();
  const { rows } = await db.query(sql, params);
  const historyRows: HistoryRecordQueryRow[] = rows;
  const results: HistoryRecordResult[] = await BluebirdPromise.map(
    historyRows,
    async (row: HistoryRecordQueryRow) => {
      const historyData: HistoryDataEntry = JSON.parse(row.history_data);
      if (row.opcode === 'NAME_UPDATE') {
        const subdomains = await getSubdomainRegistrationsForTxid(row.txid);
        return {
          ...row,
          historyData,
          subdomains: subdomains.map(sub => sub.name)
        };
      }
      return {
        ...row,
        historyData
      };
    }
  );
  return results;
};

export type NameHistoryResult = HistoryRecordQueryRow & Partial<HistoryDataEntry>;

export const getNameHistory = async (name: string): Promise<NameHistoryResult[]> => {
  const sql =
    'select * from history WHERE history_id = $1 ORDER BY block_id DESC';
  const params = [name];
  const db = await getDB();
  const { rows } = await db.query(sql, params);
  const historyRecords: HistoryRecordQueryRow[] = rows;
  const results = historyRecords.map(row => {
    const historyData: HistoryDataEntry = JSON.parse(row.history_data);
    const result: NameHistoryResult = {
      ...historyData,
      ...row
    };
    return result;
  });
  return results;
};

export const getVestingTotalForAddress = async (_address: string): Promise<number> => {
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

export interface UnlockedSupply {
  blockHeight: string;
  unlockedSupply: BigNumber;
}

export async function getUnlockedSupply(): Promise<UnlockedSupply> {
  const sql = `
    WITH 
    block_height AS (SELECT MAX(block_id) from accounts),
    totals AS (
      SELECT DISTINCT ON (address) credit_value, debit_value 
        FROM accounts 
        WHERE type = 'STACKS' 
        AND address !~ '(-|_)' 
        AND length(address) BETWEEN 33 AND 34 
        AND receive_whitelisted = '1' 
        AND lock_transfer_block_id <= (SELECT * from block_height) 
        ORDER BY address, block_id DESC, vtxindex DESC 
    )
    SELECT (SELECT * from block_height) AS val
    UNION ALL
    SELECT SUM(
      CAST(totals.credit_value AS bigint) - CAST(totals.debit_value AS bigint)
    ) AS val FROM totals`;
  const db = await getDB();
  const { rows } = await db.query(sql);
  if (!rows || rows.length !== 2) {
    throw new Error('Failed to retrieve total_supply in accounts query');
  }
  const blockHeight: string = rows[0].val;
  const unlockedSupply = new BigNumber(rows[1].val);
  return {
    blockHeight,
    unlockedSupply,
  };
}

export interface BalanceInfo {
  address: string;
  balance: BigNumber;
}

export async function getTopBalances(count: number): Promise<BalanceInfo[]> {
  const sql = `
    SELECT * FROM (
      SELECT DISTINCT ON (address) address, (CAST(credit_value AS bigint) - CAST(debit_value AS bigint)) as balance
          FROM accounts 
          WHERE type = 'STACKS' 
          AND address !~ '(-|_)' 
          AND length(address) BETWEEN 33 AND 34 
          AND receive_whitelisted = '1' 
          AND lock_transfer_block_id <= (SELECT MAX(block_id) from accounts)
          ORDER BY address, block_id DESC, vtxindex DESC
    ) as balances
    ORDER BY balance DESC
    LIMIT $1`;
  const db = await getDB();
  const params = [count];
  const { rows } = await db.query(sql, params);
  const balances: BalanceInfo[] = rows.map(row => ({
    address: row.address,
    balance: new BigNumber(row.balance),
  }));
  return balances;
}

export type HistoryRecordData = HistoryRecordQueryRow & { 
  historyData: HistoryDataEntry ;
};

export const getHistoryFromTxid = async (
  txid: string
): Promise<HistoryRecordData | null> => {
  const sql = 'SELECT * from history where txid = $1';
  const params = [txid];
  const db = await getDB();
  const { rows } = await db.query(sql, params);
  const historyRecords: HistoryRecordQueryRow[] = rows;
  const [row] = historyRecords;
  if (!row) return null;
  return {
    ...row,
    historyData: JSON.parse(row.history_data) as HistoryDataEntry
  };
};

export const getAddressSTXTransactions = async (
  btcAddress: string, 
  page: number, 
  limit = 50
): Promise<HistoryRecordData[]> => {
  if (!page || !Number.isFinite(page) || page < 0) {
    page = 0;
  }
  const sql = 'SELECT * from history where history_data LIKE $1 order by block_id DESC, vtxindex DESC LIMIT $2 OFFSET $3';
  const offset = page * limit;
  const params = [`%${btcAddress}%`, limit, offset];
  const db = await getDB();
  const { rows } = await db.query(sql, params);
  const historyRecords: HistoryRecordQueryRow[] = rows;
  const history = historyRecords.map(row => ({
    ...row,
    historyData: JSON.parse(row.history_data) as HistoryDataEntry
  }));
  return history;
};

export type Vesting = {
  totalUnlocked: number;
  totalLocked: number;
  vestingTotal: number;
};

export type AccountVesting = {
  address: string;
  vesting_value: string;
  block_id: number;
};

export const getAccountVesting = async (
  btcAddress: string
): Promise<AccountVesting[]> => {
  const sql =
    'SELECT * FROM account_vesting where address = $1 ORDER BY block_id ASC;';
  const db = await getDB();
  const params = [btcAddress];
  const { rows }: { rows: AccountVesting[] } = await db.query(sql, params);
  return rows;
};

export const getVestingForAddress = async (
  btcAddress: string
): Promise<Vesting> => {
  const latestBlock = await getLatestBlock();
  const rows = await getAccountVesting(btcAddress);
  let totalUnlocked = 0;
  let totalLocked = 0;
  let vestingTotal = 0;
  rows.forEach(row => {
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
    vestingTotal
  };
};

interface Account {
  credit_value: string;
}

export const getTokensGrantedInHardFork = async (
  btcAddress: string
): Promise<number> => {
  const sql =
    'SELECT * FROM blockstack_core.accounts where address = $1 and block_id = 373601 LIMIT 10;';
  const db = await getDB();
  const params = [btcAddress];
  const { rows }: { rows: Account[] } = await db.query(sql, params);
  let total = 0;
  rows.forEach(row => {
    total += parseInt(row.credit_value, 10);
  });
  return total;
};

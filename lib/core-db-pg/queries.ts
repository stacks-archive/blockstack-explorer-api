import * as BluebirdPromise from 'bluebird';
import * as c32check from 'c32check';
import BigNumber from 'bignumber.js';
import { getDB } from './index';
import { getLatestBlock } from '../bitcore-db/queries';
import { 
  HistoryDataEntry, HistoryDataTokenTransfer, HistoryDataNameOp 
} from './history-data-types';

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
  const rows = await db.query<SubdomainRecordQueryResult>(sql, params);
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
  const nameRows = await db.query<NameRecordQueryResult>(sql, params);
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
  blockHeight: number;
  op: string;
  opcode: string;
  historyData: HistoryDataTokenTransfer;
};

export const getTotalSubdomainCount = async(): Promise<number> => {
  // Note: this query is very slow given ~2 million rows
  // `SELECT COUNT(DISTINCT fully_qualified_subdomain) FROM subdomain_records`
  // Instead, get total count, then subtract by count of non-accepted
  const sql = `
    SELECT count(*) FROM subdomain_records
    UNION ALL
    SELECT count(*) FROM subdomain_records WHERE accepted != 1`;
  const db = await getDB();
  const result = await db.query<{ count: string }>(sql);
  const allRecordsCount = parseInt(result[0].count, 10);
  const nonAcceptedCount = parseInt(result[1].count, 10);
  const totalCountValid = allRecordsCount - nonAcceptedCount;
  return totalCountValid;
};

export const getRecentStacksTransfers = async (limit: number, page = 0): Promise<StacksTransaction[]> => {
  const sql = `
    SELECT * FROM history
    WHERE opcode = 'TOKEN_TRANSFER'
    ORDER BY block_id DESC, vtxindex DESC 
    LIMIT $1 OFFSET $2`;
  const params = [limit, page * limit];
  const db = await getDB();
  const historyRows = await db.query<HistoryRecordQueryRow>(sql, params);
  const results: StacksTransaction[] = historyRows.map(row => {
    let historyData: HistoryDataTokenTransfer;
    try {
      historyData = JSON.parse(row.history_data);
    } catch (error) {
      console.error('Error parsing tx history data');
      console.error(error);
    }
    return {
      ...row,
      blockHeight: row.block_id,
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
  value_hash?: string | null;
}

export const getNameOperationCountsForBlocks = async (
  blockHeights: number[]
) => {
  const sql = `
    SELECT records.block_id, COUNT(*)::int as name_ops
    FROM (
      SELECT 
        h.block_id, h.history_id,
        s.owner
      FROM history h
      LEFT JOIN subdomain_records s
      ON h.txid = s.txid
      WHERE (
        s.owner IS NOT NULL
        OR h.opcode in (
          'NAME_REGISTRATION', 'NAME_PREORDER', 'NAME_RENEWAL', 'NAME_IMPORT', 'NAME_TRANSFER'
        )
      )
    ) as records WHERE records.block_id = ANY($1::int[])
    GROUP BY records.block_id`;
  const params = [blockHeights];
  const db = await getDB();
  const historyRows = await db.query<{block_id: number; name_ops: number}>(sql, params);
  const results: { [block_id: number]: number } = {};
  historyRows.forEach(row => {
    results[row.block_id] = row.name_ops;
  });
  return results;
};


export type NameOperationsForBlockResult = HistoryRecordQueryRow & HistoryDataNameOp;

export const getNameOperationsForBlock = async (
  blockHeight: number
) => {
  const sql = `
    SELECT 
      h.block_id, h.history_id, h.creator_address, h.history_data, h.opcode, h.vtxindex,
      s.owner, s.fully_qualified_subdomain
    FROM history h
    LEFT JOIN (SELECT * FROM subdomain_records WHERE block_height = $1) s
    ON h.txid = s.txid
    WHERE (h.block_id = $1) AND (
      s.owner IS NOT NULL
      OR h.opcode in (
        'NAME_REGISTRATION', 'NAME_PREORDER', 'NAME_RENEWAL', 'NAME_IMPORT', 'NAME_TRANSFER'
      )
    )
    ORDER BY h.block_id DESC, h.vtxindex DESC`;
  const params = [blockHeight];
  const db = await getDB();
  const historyRows = await db.query<HistoryRecordQueryRow & NameRegistrationQueryRow>(sql, params);
  const results = historyRows.map(row => {
    const historyData: HistoryDataNameOp = JSON.parse(row.history_data);
    const isSubdomain = !!row.fully_qualified_subdomain
    const address = isSubdomain ? row.owner : (row.creator_address || historyData.address);
    const name = isSubdomain ? row.fully_qualified_subdomain : row.history_id;
    const result = {
      ...row,
      ...historyData,
      address: address,
      owner: address,
      name: name
    };
    return result;
  });
  return results;
};

export const getSubdomainRegistrationsForTxid = async (txid: string) => {
  const sql = 'SELECT * FROM subdomain_records WHERE txid = $1';
  const params = [txid];
  const db = await getDB();
  const rows = await db.query<SubdomainRecordQueryResult>(sql, params);
  const results: Subdomain[] = rows.map(row => ({
    ...row,
    name: row.fully_qualified_subdomain,
    blockHeight: parseInt(row.block_height, 10)
  }));
  return results;
};

export type NameRegistrationQueryRow = {
  block_id: number;
  history_id: string;
  creator_address: string;
  owner: string;
  fully_qualified_subdomain: string;
};

export const getAllNameOperations = async (page = 0, limit = 100): Promise<NameRegistrationQueryRow[]> => {
  const sql = `
    SELECT 
      h.block_id, h.history_id, h.creator_address,
      s.owner, s.fully_qualified_subdomain
    FROM (
      SELECT * from history
      WHERE opcode in ('NAME_UPDATE', 'NAME_REGISTRATION')
      ORDER BY block_id DESC
        LIMIT $1 OFFSET $2
      ) as h
    LEFT JOIN subdomain_records s
    ON h.txid = s.txid
    WHERE (
      s.owner IS NOT NULL
      OR h.opcode = 'NAME_REGISTRATION'
    )
    ORDER BY h.block_id DESC, h.vtxindex DESC
    LIMIT $1 OFFSET $2`;
  const offset = page * limit;
  const params = [limit, offset];
  const db = await getDB();
  const historyRows = await db.query<NameRegistrationQueryRow>(sql, params);
  return historyRows;
};

export type HistoryRecordResult = (HistoryRecordQueryRow & { 
  historyData: HistoryDataEntry; 
  subdomains?: string[];
});

export const getAllHistoryRecords = async (limit: number, page = 0): Promise<HistoryRecordResult[]> => {
  const sql = `
    SELECT * FROM (
      SELECT * from history
      WHERE opcode in (
        'NAME_UPDATE', 'NAME_REGISTRATION', 'NAME_PREORDER', 'NAME_RENEWAL', 
        'NAME_IMPORT', 'NAME_TRANSFER', 'TOKEN_TRANSFER'
      )
      ORDER BY block_id DESC, vtxindex DESC
      LIMIT $1 OFFSET $2
    ) h, 
    LATERAL (
      SELECT ARRAY (
        SELECT s.fully_qualified_subdomain || ':' || s.owner
        FROM subdomain_records s
        WHERE h.txid = s.txid
      ) AS subdomains
    ) s`;
  const params = [limit, limit * page];
  const db = await getDB();
  const historyRows = await db.query<HistoryRecordQueryRow & {
    subdomains?: string[]; 
  }>(sql, params);
  const results = historyRows.map((row) => {
    const historyData: HistoryDataEntry = JSON.parse(row.history_data);
    if (row.opcode === 'NAME_UPDATE') {
      const subdomains = row.subdomains.map(s => s.split(':')[0]);
      return {
        ...row,
        historyData,
        subdomains: subdomains
      };
    }
    return {
      ...row,
      historyData
    };
  });
  const filtered = results.filter(record => {
    if (record.opcode === 'NAME_UPDATE' && record.subdomains.length === 0) {
      return false;
    }
    return true;
  })
  return filtered;
};

export const getNameHistory = async (name: string, page = 0, limit = 20) => {
  const sql = `
    SELECT 
      h.block_id, h.history_id, h.creator_address, h.history_data, h.txid, h.opcode,
      s.owner, s.fully_qualified_subdomain 
    FROM (
      SELECT * FROM history h
      WHERE h.history_id = $1 AND h.opcode IN (
        'NAME_REGISTRATION', 'NAME_PREORDER', 
        'NAME_RENEWAL', 'NAME_IMPORT', 'NAME_TRANSFER'
      )
      ORDER BY block_id DESC, vtxindex DESC
      LIMIT $2 OFFSET $3
    ) h
    LEFT JOIN subdomain_records s ON h.txid = s.txid
    UNION ALL
    SELECT 
      h.block_id, h.history_id, h.creator_address, h.history_data, h.txid, h.opcode,
      s.owner, s.fully_qualified_subdomain 
    FROM (
      SELECT * FROM subdomain_records s
      WHERE s.fully_qualified_subdomain = $1
    ) s
    LEFT JOIN history h ON h.txid = s.txid`;
  const offset = page * limit;
  const params = [name, limit, offset];
  const db = await getDB();
  const historyRows = await db.query<NameRegistrationQueryRow & { 
    history_data: string;
    txid: string;
  }>(sql, params);
  const results = historyRows.map(row => {
    const historyData: HistoryDataNameOp = JSON.parse(row.history_data);
    const isSubdomain = !!row.fully_qualified_subdomain
    const address = isSubdomain ? row.owner : (row.creator_address || historyData.address);
    const name = isSubdomain ? row.fully_qualified_subdomain : row.history_id;
    const result = {
      opcode: isSubdomain ? '' : historyData.opcode,
      block_id: row.block_id,
      txid: row.txid,
      name: name,
      owner: address,
      address: address,
      sender: historyData.sender,
    }
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
    const rows = await db.query<{vesting_value: string}>(sql, params);
    const vestingTotal = rows.reduce((prev, row) => {
      const vestAtBlock = row.vesting_value;
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
  const rows = await db.query<{val: string}>(sql);
  if (!rows || rows.length !== 2) {
    throw new Error('Failed to retrieve total_supply in accounts query');
  }
  const blockHeight = rows[0].val;
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
  const rows = await db.query<BalanceInfo>(sql, params);
  const balances: BalanceInfo[] = rows.map(row => ({
    address: row.address,
    balance: new BigNumber(row.balance),
  }));
  return balances;
}

export type HistoryRecordData = HistoryRecordQueryRow & { 
  historyData: HistoryDataEntry;
};

export const getHistoryFromTxid = async (
  txid: string
): Promise<HistoryRecordData | null> => {
  const sql = 'SELECT * from history where txid = $1';
  const params = [txid];
  const db = await getDB();
  const historyRecords = await db.query<HistoryRecordQueryRow>(sql, params);
  const [row] = historyRecords;
  if (!row) return null;
  return {
    ...row,
    historyData: JSON.parse(row.history_data) as HistoryDataEntry
  };
};

export type StacksHistoryRecordData = HistoryRecordQueryRow & { 
  historyData: HistoryDataTokenTransfer;
};

export const getAddressSTXTransactions = async (
  btcAddress: string, 
  page: number, 
  limit = 50
): Promise<StacksHistoryRecordData[]> => {
  if (!page || !Number.isFinite(page) || page < 0) {
    page = 0;
  }
  const sql = `SELECT * from history WHERE 
    opcode = 'TOKEN_TRANSFER' AND history_data LIKE $1 
    order by block_id DESC, vtxindex DESC LIMIT $2 OFFSET $3`;
  const offset = page * limit;
  const params = [`%${btcAddress}%`, limit, offset];
  const db = await getDB();
  const historyRecords = await db.query<HistoryRecordQueryRow>(sql, params);
  const history = historyRecords.map(row => ({
    ...row,
    historyData: JSON.parse(row.history_data) as HistoryDataTokenTransfer
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
  const rows = await db.query<AccountVesting>(sql, params);
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
  const rows = await db.query<Account>(sql, params);
  let total = 0;
  rows.forEach(row => {
    total += parseInt(row.credit_value, 10);
  });
  return total;
};

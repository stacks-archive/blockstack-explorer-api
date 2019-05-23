import { getAll, DB, get } from './index';

interface Subdomain {
  name: string,
  blockHeight: number,
  owner: string,
  [key: string]: any,
}

export const getRecentSubdomains = async (limit: number, page: number = 0): Promise<Subdomain[]> => {
  const sql = 'select * from subdomain_records ORDER BY block_height DESC LIMIT $1 OFFSET $2;';
  const params = { $1: limit, $2: page * limit };
  const rows = await getAll(DB.Subdomains, sql, params);
  const results: Subdomain[] = rows.map(row => ({
    ...row,
    name: row.fully_qualified_subdomain,
    owner: row.owner,
    blockHeight: row.block_height,
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
  const params = { $1: limit, $2: page * limit };
  const rows = await getAll(DB.Blockstack, sql, params);
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

export const getStacksHolderCount = async (): Promise<number> => {
  const sql = 'SELECT count(*) as count from accounts where (credit_value - debit_value) > 0;';
  const row = await get(DB.Blockstack, sql);
  return <number>row.count;
};

interface StacksTransaction {
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
  const params = { $1: limit, $2: page * limit };
  const rows = await getAll(DB.Blockstack, sql, params);
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
      opcode: row.opCode,
      historyData,
    };
  });
  return results;
};

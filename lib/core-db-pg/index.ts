// import sqlite, { Database } from 'sqlite3';
import { Pool } from 'pg';

let client: Pool | null = null;

export const getDB = async (): Promise<Pool> => {
  if (client) {
    return client;
  }
  // eslint-disable-next-line no-underscore-dangle
  const _client = new Pool();
  await _client.connect();
  client = _client;
  return _client;
};

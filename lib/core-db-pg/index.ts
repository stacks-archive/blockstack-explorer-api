// import sqlite, { Database } from 'sqlite3';
import { Client } from 'pg';

let client: Client | null = null;

export const getDB = async (): Promise<Client> => {
  if (client) {
    return <Client>client;
  }
  // eslint-disable-next-line no-underscore-dangle
  const _client = new Client();
  await _client.connect();
  client = _client;
  return _client;
};

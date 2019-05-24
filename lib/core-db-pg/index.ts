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

// export enum DB {
//   Subdomains = 'subdomains',
//   Blockstack = 'blockstack-server',
// }

// interface DBsHash {
//   [DB.Subdomains]: sqlite.Database | null;
//   [DB.Blockstack]: sqlite.Database | null;
// }

// const DBs: DBsHash = {
//   [DB.Subdomains]: null,
//   [DB.Blockstack]: null,
// };

// export const getDB = (name: DB): Database => {
//   if (DBs[name]) {
//     return <Database>DBs[name];
//   }
//   const corePath = <string>`${process.env.CORE_DB}${name}.db`;
//   const newDB = new sqlite.Database(corePath, sqlite.OPEN_READONLY, (err: Error | null) => {
//     if (err) {
//       throw err;
//     }
//   });
//   DBs[name] = newDB;
//   return newDB;
// };

// export const getAll = async (dbName: DB, query: string, params?: any): Promise<any[]> => (
//   new Promise(async (resolve, reject) => {
//     const db = getDB(dbName);
//     db.all(query, params || {}, (err: Error | null, rows: any[]) => {
//       if (err) {
//         return reject(err);
//       }
//       return resolve(rows);
//     });
//   })
// );

// export const get = async (dbName: DB, query: string): Promise<any> => (
//   new Promise(async (resolve, reject) => {
//     const db = getDB(dbName);
//     db.get(query, (err: Error | null, row: any) => {
//       if (err) {
//         return reject(err);
//       }
//       return resolve(row);
//     });
//   })
// );

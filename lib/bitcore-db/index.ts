import { MongoClient, Db } from 'mongodb';

let DB: Db | null = null;

export const getDB = async (): Promise<Db> => {
  const url = process.env.BITCORE_MONGODB_URI;
  if (DB) {
    return DB;
  }
  const client = new MongoClient(url, {
    reconnectTries: Number.MAX_VALUE,
    reconnectInterval: 1000, // every 1 second
    useNewUrlParser: true
  });
  await client.connect();
  DB = client.db('bitcore');
  return DB;
};

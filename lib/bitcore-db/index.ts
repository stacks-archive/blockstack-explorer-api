import { MongoClient, Db } from 'mongodb';

const url = process.env.BITCORE_MONGODB_URI;

let DB: Db | null = null;

export const getDB = async (): Promise<Db> => {
  if (DB) {
    return <Db>DB;
  }
  const client = new MongoClient(<string>url);
  await client.connect();
  DB = client.db('bitcore');
  return DB;
};

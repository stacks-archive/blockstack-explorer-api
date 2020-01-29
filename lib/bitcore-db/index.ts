import { MongoClient, Db, Collection } from 'mongodb';

export class BitcoreDB {
  private readonly db: Db;
  private constructor(db: Db) {
    this.db = db;
  }
  static async init(): Promise<BitcoreDB> {
    const url = process.env.BITCORE_MONGODB_URI;
    let client: MongoClient;
    try {
      client = await MongoClient.connect(url, {
        poolSize: 20,
        reconnectTries: Number.MAX_VALUE,
        reconnectInterval: 1000, // every 1 second
        useNewUrlParser: true
      })
    } catch (error) {
      console.error(error);
      console.error(`Error connecting to Bitcore MongoDB`);
      throw error;
    }
    const db = client.db('bitcore');
    return new BitcoreDB(db);
  }
  
  // Forces a type to be specified.
  collection<T extends { [key: string]: any } | unknown = void>(
    name: string
  ): T extends void ? never : Collection<T> {
    return this.db.collection<T>(name) as any;
  }
}

let bitcoreDB: Promise<BitcoreDB>;
export const getDB = (): Promise<BitcoreDB> => {
  if (bitcoreDB !== undefined) {
    return bitcoreDB
  }
  bitcoreDB = BitcoreDB.init();
  return bitcoreDB;
};

import { Pool, QueryResult } from 'pg';

export class PgDB {

  private static dbInstance?: Promise<PgDB>;

  static getInstance(): Promise<PgDB> {
    if (this.dbInstance === undefined) {
      this.dbInstance = (async () => {
        const client = new Pool();
        await client.connect();
        return new PgDB(client);
      })();
    }
    return this.dbInstance;
  }

  readonly client: Pool;

  constructor(client: Pool) {
    this.client = client;
  }

  async query<T = void>(sql: string, params?: (string | number)[]): Promise<T[]> {
    const result = await this.client.query<T>(sql, params);
    return result.rows;
  }

  async querySingle<T = void>(sql: string, params?: (string | number)[]): Promise<T | null> {
    const result = await this.client.query<T>(sql, params);
    const rows = result.rows;
    if (rows.length > 1) {
      throw new Error(`Query for single row returned ${rows.length} rows`);
    }
    if (rows.length == 0) {
      return null;
    }
    return rows[0];
  }
}

export const getDB = (): Promise<PgDB> => {
  return PgDB.getInstance();
};

import { Pool } from 'pg';

let client: Pool | null = null;

// TODO: create a wrapped db class with a query method that forces type specification

export const getDB = async (): Promise<Pool> => {
  if (client) {
    return client;
  }
  const newClient = new Pool();
  await newClient.connect();
  client = newClient;
  return newClient;
};

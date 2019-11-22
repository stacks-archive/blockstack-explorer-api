import { Pool } from 'pg';

let client: Pool | null = null;

export const getDB = async (): Promise<Pool> => {
  if (client) {
    return client;
  }
  const newClient = new Pool();
  await newClient.connect();
  client = newClient;
  return newClient;
};

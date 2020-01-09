import * as redis from 'redis';
import { promisify } from 'util';

const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const client = redis.createClient(url, {
  prefix: `blockstack-explorer-${process.env.NODE_ENV}`
});

interface RedisClientAsync {
  getAsync(key: string): Promise<string>;
  setAsync(key: string, value: string, mode?: string, duration?: number): Promise<unknown>;
  delAsync(key: string): Promise<number>;
  keysAsync(key: string): Promise<string[]>;
}

/* eslint-disable @typescript-eslint/unbound-method */
const asyncFunctions: RedisClientAsync = {
  getAsync: promisify(client.get).bind(client),
  setAsync: promisify(client.set).bind(client),
  delAsync: promisify(client.del).bind(client),
  keysAsync: promisify(client.keys).bind(client),
}
/* eslint-enable @typescript-eslint/unbound-method */

const asyncClient: redis.RedisClient & RedisClientAsync = Object.assign(client, asyncFunctions);

export default asyncClient;


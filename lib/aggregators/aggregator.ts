import redis from '../redis';
import * as ChildProcess from 'child_process';
import * as Sentry from '@sentry/node';

export type Json =
    | string
    | number
    | boolean
    | null
    | { [property: string]: Json }
    | Json[];

export type PossibleJson = Json | void;

export type AggregatorSetterResult<TResult extends Json> = {
  value: TResult;
  shouldCacheValue: boolean;
};

export abstract class AggregatorWithArgs<TResult extends Json, TArgs extends PossibleJson = void> {

  readonly pendingAggregations: Map<string, Promise<TResult>> = new Map();

  key(args: TArgs): string {
    if (args !== undefined) {
      const argStr = JSON.stringify(args);
      return `${this.constructor.name}:${argStr}`
    }
    return this.constructor.name;
  }

  async keyWithTag(args: TArgs): Promise<string> {
    const tag = await this.getCurrentGitTag();
    const key = this.key(args);
    if (tag) {
      return `${key}-${tag}`
    }
    return key;
  }

  async set(args: TArgs): Promise<TResult> {
    // const verbose = this.verbose(...args);
    const key = await this.keyWithTag(args);
    const { value, shouldCacheValue} = await this.setter(args);

    if (shouldCacheValue) {
      const valArg = JSON.stringify(value);
      const expiry = this.expiry(args);
      if (expiry) {
        await redis.setAsync(key, valArg, 'EX', expiry);
      } else {
        await redis.setAsync(key, valArg);
      }
    }
    return value;
  }

  async get(args: TArgs): Promise<TResult | null> {
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    const value = await redis.getAsync(await this.keyWithTag(args));
    if (value) {
      return JSON.parse(value);
    }
    return null;
  }

  abstract setter(args: TArgs): Promise<AggregatorSetterResult<TResult>>;

  async fetch(args: TArgs): Promise<TResult> {
    const isDevEnv = process.env.NODE_ENV === 'development';
    const verbose = isDevEnv || this.verbose(args);
    const key = await this.keyWithTag(args);
    if (verbose) { 
      console.log(`Running aggregator: "${key}"`); 
    }
    
    if (!isDevEnv) {
      const value = await this.get(args);
      if (value) {
        if (verbose) {
          console.log(`Found cached value for "${key}"`);
        }
        return value;
      }
    }

    const pendingAggregation: Promise<TResult> = this.pendingAggregations.get(key);
    if (pendingAggregation !== undefined) {
      if (verbose) {
        console.log(`Found pending aggregation promise for "${key}". Re-using.`);
      }
      return pendingAggregation;
    }

    if (verbose) {
      console.log(`Cached value not found for "${key}". Fetching data.`);
    }

    const hrstart = process.hrtime();
    try {
      const aggregationPromise = this.set(args);
      this.pendingAggregations.set(key, aggregationPromise);
      const result = await aggregationPromise;
      return result;
    } catch (error) {
      console.error(`Error running aggregator: "${key}"`);
      console.error(error);
      throw error;
    } finally {
      this.pendingAggregations.delete(key);
      const hrend = process.hrtime(hrstart);
      const elapsedSeconds = (hrend[0] + (hrend[1] / 1e9));
      if (elapsedSeconds > 10) {
        const warning = `Warning: aggregation for "${key}" took ${elapsedSeconds} seconds`;
        Sentry.captureMessage(warning);
        console.error(warning);
      }
      if (verbose) {
        console.log(`Fetching data for "${key}" took ${elapsedSeconds.toFixed(4)} seconds`);
      }
    }
  }

  expiry(args: TArgs): number | null {
    return null;
  }

  verbose(args: TArgs): boolean {
    return true;
  }

  getCurrentGitTag(): Promise<string> {
    return new Promise(resolve => {
      const command =
        "git describe --exact-match --tags $(git log -n1 --pretty='%h')";
      // eslint-disable-next-line global-require
      ChildProcess.exec(command, (err, stdout) => {
        if (err) {
          resolve('');
        }
        resolve((stdout || '').trim());
      });
    });
  }
}

export abstract class Aggregator<TResult extends Json> extends AggregatorWithArgs<TResult, undefined> {
  key(): string {
    return super.key(undefined);
  }
  keyWithTag(): Promise<string> {
    return super.keyWithTag(undefined);
  }
  get(): Promise<TResult | null> {
    return super.get(undefined);
  }
  abstract setter(): Promise<AggregatorSetterResult<TResult>>;
  set(): Promise<TResult> {
    return super.set(undefined);
  }
  fetch(): Promise<TResult> {
    return super.fetch(undefined);
  }
  expiry(): number | null {
    return super.expiry(undefined);
  }
  verbose(): boolean {
    return super.verbose(undefined);
  }
}


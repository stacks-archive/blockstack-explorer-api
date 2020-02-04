import redis from '../redis';
import * as ChildProcess from 'child_process';
import * as Sentry from '@sentry/node';
import BigNumber from 'bignumber.js';
import { EventEmitter } from 'events';
import StrictEventEmitter from 'strict-event-emitter-types';
import { logError, getStopwatch, Json } from '../utils';

export type AggregatorSetterResult<TResult extends Json> = {
  value: TResult;
  shouldCacheValue: boolean;
};

export type KeepAliveOptions = false | {
  readonly aggregatorKey: string;
  readonly aggregatorArgs: Json | void;
  /** How many seconds to wait between refreshes. */
  readonly interval: number;
  /** How many times to refresh before stopping. A falsy value indicates an infinite loop. */
  readonly count?: number;
}

interface KeepAliveTimer { 
  timer: NodeJS.Timeout;
  opts: KeepAliveOptions;
  runCount: BigNumber;
}

class CacheManager {

  static readonly instance = new CacheManager();

  readonly aggregators: Aggregator<Json, Json | void>[] = [];

  readonly keepAliveTimers: Map<string, KeepAliveTimer> = new Map();

  async registerAggregator(aggregator: Aggregator<Json, Json | void>) {
    try {
      this.aggregators.push(aggregator);
      const initialKeepAliveOpts = await aggregator.getInitialKeepAliveOptions();
      await this.updateKeepAlive(aggregator, initialKeepAliveOpts);
      aggregator.on('updateKeepAlive', (aggregator, opts) => {
        this.updateKeepAlive(aggregator, opts);
      });
    } catch (error) {
      const msg = `Error registering aggregator ${aggregator.constructor.name} with cache manager: ${error}`;
      logError(msg, error);
      try {
        await Sentry.close(error);
      } catch (error) {
        // ignore
      }
      process.exit(1);
    }
  }

  async updateKeepAlive(aggregator: Aggregator<Json, Json | void>, opts: KeepAliveOptions) {
    if (!opts) {
      return;
    }
    if (this.keepAliveTimers.has(opts.aggregatorKey)) {
      return;
    }
    const key = await aggregator.keyWithTag(opts.aggregatorArgs);
    console.log(`Scheduling auto cache refresh for "${key}", every ${opts.interval} seconds`);
    const intervalMS = opts.interval * 1000;
    const keepAliveInstance = {
      opts,
      runCount: new BigNumber(0),
      timer: setInterval(() => {
        keepAliveInstance.runCount = keepAliveInstance.runCount.plus(1);
        const timerCompleted = opts.count > 0 && keepAliveInstance.runCount.gt(opts.count);
        if (timerCompleted) {
          clearInterval(keepAliveInstance.timer);
        }
        aggregator.fetch(opts.aggregatorArgs, true).catch(error => {
          const msg = `Error running keep-alive refresh for aggregator ${aggregator.constructor.name}: ${error}`;
          logError(msg, error);
        }).finally(() => {
          if (timerCompleted) {
            this.keepAliveTimers.delete(opts.aggregatorKey);
          }
        });
      }, intervalMS),
    };
    this.keepAliveTimers.set(opts.aggregatorKey, keepAliveInstance);
  }
}

type KeepAliveEventEmitter = StrictEventEmitter<EventEmitter, {
  updateKeepAlive: (aggregator: Aggregator<Json, Json | void>, request: KeepAliveOptions) => void;
}>;

export abstract class Aggregator<TResult extends Json, TArgs extends Json | void = void> 
  extends (EventEmitter as new () => KeepAliveEventEmitter)
  implements KeepAliveEventEmitter {

  readonly pendingAggregations: Map<string, Promise<TResult>> = new Map();

  constructor() {
    super();
    if (process.env.NODE_ENV !== 'test') {
      CacheManager.instance.registerAggregator(this);
    }
  }

  getInitialKeepAliveOptions(): Promise<KeepAliveOptions> {
    return Promise.resolve(false);
  }

  getKeepAliveOptions(key: string, args: TArgs): KeepAliveOptions {
    return false;
  }

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

    const keepAliveOpts = this.getKeepAliveOptions(key, args);
    this.emit('updateKeepAlive', this, keepAliveOpts);

    const { value, shouldCacheValue } = await this.setter(args);

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

  async fetch(args: TArgs, ignoreCache = false): Promise<TResult> {
    const isDevEnv = process.env.NODE_ENV === 'development';
    const verbose = isDevEnv || this.verbose(args);
    const key = await this.keyWithTag(args);
    if (verbose) { 
      console.log(`Running aggregator: "${key}"`); 
    }
    
    if (!isDevEnv && !ignoreCache) {
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

    if (verbose && !ignoreCache) {
      console.log(`Cached value not found for "${key}". Fetching data.`);
    }

    const stopwatch = getStopwatch();
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
      const elapsedSeconds = stopwatch.getElapsedSeconds();
      if (elapsedSeconds > 10) {
        const warning = `Warning: aggregation for "${key}" took ${elapsedSeconds} seconds`;
        logError(warning);
      }
      if (verbose) {
        console.log(`Fetching data for "${key}" took ${elapsedSeconds.toFixed(3)} seconds`);
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


import redis from '../redis';
import BigNumber from 'bignumber.js';
import { EventEmitter } from 'events';
import StrictEventEmitter from 'strict-event-emitter-types';
import { logError, logWarning, getStopwatch, Json, getCurrentGitTag, logDebug } from '../utils';

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

  registerAggregator(aggregator: Aggregator<Json, Json | void>) {
    try {
      this.aggregators.push(aggregator);
      aggregator.on('updateKeepAlive', (aggregator, opts) => {
        try {
          this.updateKeepAlive(aggregator, opts);
        } catch (error) {
          const msg = `Error updating keep alive for aggregator key ${opts.aggregatorKey}: ${error}`;
          logError(msg, error);
        }
      });
    } catch (error) {
      const msg = `Error registering aggregator ${aggregator.constructor.name} with cache manager: ${error}`;
      logError(msg, error);
      process.exit(1);
    }
  }

  updateKeepAlive(aggregator: Aggregator<Json, Json | void>, opts: KeepAliveOptions) {
    if (!opts) {
      return;
    }
    if (this.keepAliveTimers.has(opts.aggregatorKey)) {
      return;
    }
    const key = aggregator.keyWithTag(opts.aggregatorArgs);
    logDebug(`Scheduling auto cache refresh for "${key}", every ${opts.interval} seconds`);
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
  updateKeepAlive: (
    aggregator: Aggregator<Json, Json | void>, 
    request: Exclude<KeepAliveOptions, false>
  ) => void;
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

  keyWithTag(args: TArgs): string {
    const tag = getCurrentGitTag();
    const key = this.key(args);
    if (tag) {
      return `${key}-${tag}`
    }
    return key;
  }

  async set(args: TArgs): Promise<TResult> {
    const key = this.keyWithTag(args);

    const keepAliveOpts = this.getKeepAliveOptions(key, args);
    if (keepAliveOpts) {
      setImmediate(() => {
        this.emit('updateKeepAlive', this, keepAliveOpts);
      })
    }
    
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
    const value = await redis.getAsync(this.keyWithTag(args));
    if (value) {
      return JSON.parse(value);
    }
    return null;
  }

  abstract setter(args: TArgs): Promise<AggregatorSetterResult<TResult>>;

  async fetch(args: TArgs, ignoreCache = false): Promise<TResult> {
    const isDevEnv = process.env.NODE_ENV === 'development';
    const key = this.keyWithTag(args);
    logDebug(`Running aggregator: "${key}"`); 
    
    if (!isDevEnv && !ignoreCache) {
      const value = await this.get(args);
      if (value) {
        logDebug(`Found cached value for "${key}"`);
        return value;
      }
    }

    const pendingAggregation: Promise<TResult> = this.pendingAggregations.get(key);
    if (pendingAggregation !== undefined) {
      logDebug(`Found pending aggregation promise for "${key}". Re-using.`);
      return pendingAggregation;
    }

    if (!ignoreCache) {
      logDebug(`Cached value not found for "${key}". Fetching data.`);
    }

    const stopwatch = getStopwatch();
    try {
      const aggregationPromise = this.set(args);
      this.pendingAggregations.set(key, aggregationPromise);
      const result = await aggregationPromise;
      return result;
    } catch (error) {
      error.aggregator = key;
      logError(`Error running aggregator: "${key}"`, error);
      throw error;
    } finally {
      this.pendingAggregations.delete(key);
      const elapsedSeconds = stopwatch.getElapsedSeconds();
      if (elapsedSeconds > 10) {
        const warning = `Warning: aggregation for "${key}" took ${elapsedSeconds} seconds`;
        logWarning(warning);
      }
      else {
        logDebug(`Fetching data for "${key}" took ${elapsedSeconds.toFixed(3)} seconds`);
      }
    }
  }

  expiry(args: TArgs): number | null {
    return null;
  }
}


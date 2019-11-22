import redis from '../redis';
import ChildProcess from 'child_process';

class Aggregator {
  static key(...args) {
    return this.name;
  }

  static async keyWithTag(...args) {
    const tag = await this.getCurrentGitTag();
    return `${this.key(...args)}-${tag}`;
  }

  static async set(...args) {
    // const verbose = this.verbose(...args);
    const key = await this.keyWithTag(...args);
    const value = await this.setter(...args);

    const valArg = JSON.stringify(value);
    const expiry = this.expiry(...args);
    if (expiry) {
      // if (verbose) console.log('Expiry:', expiry);
      await redis.setAsync(key, valArg, 'EX', expiry);
    } else {
      await redis.setAsync(key, valArg);
    }
    // console.log(setArguments);
    return value;
  }

  static async get(...args) {
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    const value = await redis.getAsync(await this.keyWithTag(...args));
    if (value) {
      return JSON.parse(value);
    }
    return null;
  }

  static setter(...args): Promise<any> {
    return Promise.resolve(null);
  }

  static async fetch(...args) {
    const verbose = this.verbose(...args);
    const key = await this.keyWithTag(...args);
    if (verbose) console.log(`Running aggregator: "${key}"`);
    const value = await this.get(...args);
    if (value) {
      if (verbose) console.log(`Found cached value for "${key}"`);
      return value;
    }
    if (verbose)
      console.log(`Cached value not found for "${key}". Fetching data.`);
    return this.set(...args);
  }

  static expiry(...args): number | null {
    return null;
  }

  static verbose(...args): boolean {
    return true;
  }

  static getCurrentGitTag(): Promise<string> {
    return new Promise(resolve => {
      const command =
        "git describe --exact-match --tags $(git log -n1 --pretty='%h')";
      // eslint-disable-next-line global-require
      ChildProcess.exec(command, (err, stdout) => {
        if (err) {
          resolve('');
        }
        resolve(stdout);
      });
    });
  }
}

export default Aggregator;

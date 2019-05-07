const redis = require('../redis');

class Aggregator {
  static key(...args) {
    return this.name;
  }

  static async set(...args) {
    // const verbose = this.verbose(...args);
    const key = this.key(...args);
    const value = await this.setter(...args);
    let setArguments: any[] = [key, JSON.stringify(value)];
    const expiry = this.expiry(...args);
    if (expiry) {
      // if (verbose) console.log('Expiry:', expiry);
      setArguments = setArguments.concat('EX', expiry);
    }
    // console.log(setArguments);
    await redis.setAsync(...setArguments);
    return value;
  }

  static async get(...args) {
    const value = await redis.getAsync(this.key(...args));
    if (value) {
      return JSON.parse(value);
    }
    return null;
  }

  static async setter(...args): Promise<any> {
    return null;
  }

  static async fetch(...args) {
    const verbose = this.verbose(...args);
    const key = this.key(...args);
    if (verbose) console.log(`Running aggregator: "${key}"`);
    const value = await this.get(...args);
    if (value) {
      if (verbose) console.log(`Found cached value for "${key}"`);
      return value;
    }
    if (verbose) console.log(`Cached value not found for "${key}". Fetching data.`);
    return this.set(...args);
  }

  static expiry(...args): number | null {
    return null;
  }

  static verbose(...args): boolean {
    return true;
  }
}

export default Aggregator;

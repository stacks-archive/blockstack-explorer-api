const Promise = require('bluebird');
const moment = require('moment');
const Sentry = require('@sentry/node');

const Aggregator = require('./aggregator');
const {
  fetchBlock, fetchTransactionSubdomains,
} = require('../client/core-api');

class BlockAggregator extends Aggregator {
  static key(hash) {
    return `Block:${hash}`;
  }

  static async setter(hash) {
    const block = await fetchBlock(hash);
    if (!block) {
      return null;
    }
    block.transactions = block.transactions.slice(0, 10);
    const { time } = block;
    block.nameOperations = await Promise.map(block.nameOperations, async (_nameOp) => {
      try {
        const nameOp = { ..._nameOp };
        nameOp.timeAgo = moment(time * 1000).fromNow(true);
        nameOp.time = time * 1000;
        if (nameOp.opcode === 'NAME_UPDATE' && (nameOp.name === 'id.blockstack')) {
          const { txid } = nameOp;
          const subdomains = await fetchTransactionSubdomains(txid);
          nameOp.subdomains = subdomains;
        }
        return nameOp;
      } catch (error) {
        console.error(error);
        Sentry.captureException(error);
        return null;
      }
    }, { concurrency: 1 });

    block.nameOperations = block.nameOperations.filter(Boolean);

    return block;
  }

  static expiry() {
    return 60 * 60 * 24 * 2; // 2 days
  }

  static verbose(hash, multi) {
    return !multi;
  }
}

module.exports = BlockAggregator;

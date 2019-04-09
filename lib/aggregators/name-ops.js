const moment = require('moment');
const flatten = require('lodash/flatten');
// const ProgressBar = require('progress');
const Promise = require('bluebird');
const MultiProgress = require('multi-progress');

const Aggregator = require('./aggregator');
const BlocksAggregator = require('./blocks');

class NameOpsAggregator extends Aggregator {
  static async setter() {
    const daysBack = Array(...new Array(2)).map((val, i) => i);
    const dates = daysBack.map((x, index) => moment()
      .utc()
      .subtract(index, 'days')
      .format('YYYY-MM-DD'));
    const multi = new MultiProgress(process.stderr);
    const blocks = flatten(await Promise.map(dates, async (date) => {
      const block = await BlocksAggregator.set(date, multi);
      return block;
    }));

    let nameOps = blocks.map(({ nameOperations, ...block }) => {
      if (!nameOperations) return [];
      const newNames = nameOperations.filter(op => op.opcode === 'NAME_REGISTRATION');
      const subdomains = nameOperations.map(nameOp => nameOp.subdomains || []);
      const ops = flatten(newNames.concat(subdomains));
      ops.forEach((op, index) => {
        ops[index].time = block.time * 1000;
        ops[index].name = op.name || op.fully_qualified_subdomain;
      });
      return ops;
    });

    nameOps = flatten(nameOps);
    // nameOps = sort(nameOps, op => -op.block_height);

    return nameOps;
  }
}

module.exports = NameOpsAggregator;

const moment = require('moment');
const accounting = require('accounting');
const sortBy = require('lodash/sortBy');

const Aggregator = require('./aggregator');
const NameOperations = require('./name-ops');
const NameCounts = require('./total-names');

const { getAccounts, getTotals } = require('../addresses');

class HomeInfo extends Aggregator {
  static async setter() {
    const accounts = await getAccounts();
    const genesisTotals = getTotals(accounts);
    const [counts, nameOperations] = await Promise.all([
      NameCounts.fetch(),
      NameOperations.fetch(),
    ]);

    const startCount = counts.total - nameOperations.length;
    let currentCount = startCount;
    const ticks = {};
    const sortedNames = sortBy(nameOperations.slice(), nameOp => parseInt(nameOp.time, 10));
    // console.log(sortedNames);
    sortedNames.forEach((nameOp) => {
      const { time } = nameOp;
      currentCount += 1;
      ticks[time] = {
        names: currentCount,
        date: moment(time).utc().format('MM/DD/YYYY h:mm UTC'),
      };
    });

    const keys = Object.keys(ticks).sort();

    const nameOperationsOverTime = keys.map((time) => {
      const tick = ticks[time];
      return {
        ...tick,
        x: parseInt(time, 10),
        y: tick.names,
        time,
      };
    });

    return {
      totalStacks: accounting.formatNumber(genesisTotals.vestedValues * 10e-7, 0),
      nameTotals: counts,
      nameOperationsOverTime,
      nameOperations,
    };
  }

  static expiry() {
    return 10 * 60; // 10 minutes
  }
}

module.exports = HomeInfo;

import moment from 'moment';
import accounting from 'accounting';
import sortBy from 'lodash/sortBy';
import NameOperations from './name-ops-v2';

import Aggregator from './aggregator';

import NameCounts from './total-names';

import { getUnlockedSupply } from '../core-db-pg/queries';

class HomeInfo extends Aggregator {
  static key() {
    return 'HomeInfo:v2';
  }

  static async setter() {
    const [counts, nameOperations] = await Promise.all([
      NameCounts.fetch(),
      NameOperations.setter(),
    ]);

    const startCount = counts.total - nameOperations.length;
    let currentCount = startCount;
    const ticks = {};
    const sortedNames = sortBy(nameOperations.slice(), nameOp => nameOp.time, 10);
    sortedNames.forEach((nameOp) => {
      const { time } = nameOp;
      currentCount += 1;
      ticks[time] = {
        names: currentCount,
        date: moment(time).utc().format('MM/DD/YYYY h:mm UTC'),
      };
    });

    const keys = Object.keys(ticks).map(date => parseInt(date, 10)).sort();

    const nameOperationsOverTime = keys.map((time) => {
      const tick = ticks[time];
      return {
        ...tick,
        x: time,
        y: tick.names,
        time,
      };
    });

    // TODO: this query is slightly off
    // const unlockedSupply = await getUnlockedSupply();
    const unlockedSupply = 426700520.464896;

    return {
      totalStacks: '1,320,000,000',
      unlockedSupply,
      unlockedSupplyFormatted: accounting.formatNumber(unlockedSupply, 0),
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
export default HomeInfo;

import * as moment from 'moment';
import { sortBy } from 'lodash';

import NameOperations, { NameOp } from './name-ops-v2';
import { AggregatorSetterResult, Aggregator, KeepAliveOptions } from './aggregator';
import NameCounts, { TotalNamesResult } from './total-names';
import TotalSupplyAggregator, { TotalSupplyResult } from './total-supply';

export type HomeInfoResult = {
  totalStacks: string;
  unlockedSupply: string;
  unlockedSupplyFormatted: string;
  nameTotals: TotalNamesResult;
  nameOperationsOverTime: {
    x: number;
    y: number;
    time: number;
    names: number;
    date: string;
  }[];
  nameOperations: NameOp[];
};

class HomeInfo extends Aggregator<HomeInfoResult> {
  key() {
    return 'HomeInfo:v2';
  }

  async getInitialKeepAliveOptions(): Promise<KeepAliveOptions> {
    return {
      aggregatorKey: await this.keyWithTag(),
      aggregatorArgs: undefined,
      interval: 10 * 60 // 10 minutes,
    };
  }

  async setter(): Promise<AggregatorSetterResult<HomeInfoResult>> {
    
    const [counts, nameOperations] = await Promise.all([
      NameCounts.fetch(),
      NameOperations.fetch({page: 0}),
    ]);
    
    const startCount = counts.total - nameOperations.length;
    let currentCount = startCount;
    const ticks: Record<number, { names: number; date: string }> = {};
    const sortedNames = sortBy(nameOperations.slice(), nameOp => nameOp.time);

    sortedNames.forEach(nameOp => {
      const { time } = nameOp;
      currentCount += 1;
      ticks[time] = {
        names: currentCount,
        date: moment.unix(time)
          .utc()
          .format('MM/DD/YYYY h:mm UTC')
      };
    });

    const keys = Object.keys(ticks)
      .map(date => parseInt(date, 10))
      .sort();

    // TODO: this needs to use a pg query using a set period of time
    // in order to construct a useful graph
    const nameOperationsOverTime = keys.map(time => {
      const tick = ticks[time];
      return {
        ...tick,
        x: time,
        y: tick.names,
        time
      };
    });

    const totalSupplyInfo: TotalSupplyResult = await TotalSupplyAggregator.fetch();
    const result = {
      totalStacks: totalSupplyInfo.totalStacksFormatted,
      unlockedSupply: totalSupplyInfo.unlockedSupply,
      unlockedSupplyFormatted: totalSupplyInfo.unlockedSupplyFormatted,
      nameTotals: counts,
      nameOperationsOverTime,
      nameOperations
    };
    return {
      shouldCacheValue: true,
      value: result,
    };
  }

  expiry() {
    return 15 * 60; // 15 minutes
  }
}

export default new HomeInfo();

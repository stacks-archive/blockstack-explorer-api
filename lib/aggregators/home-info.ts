import { NameOp, nameOpsAggregator } from './name-ops-v2';
import { AggregatorSetterResult, Aggregator, KeepAliveOptions } from './aggregator';
import { TotalNamesResult, totalNamesAggregator } from './total-names';
import { TotalSupplyResult, totalSupplyAggregator } from './total-supply';
import { getLatestBlockHeight } from '../bitcore-db/queries';
import { getRecentNameGrowth } from '../name-growth';

export type HomeInfoResult = {
  totalStacks: string;
  unlockedSupply: string;
  unlockedSupplyFormatted: string;
  nameTotals: TotalNamesResult;
  nameOperationsOverTime: {
    x: number;
    y: number;
  }[];
  nameOperations: NameOp[];
};

class HomeInfo extends Aggregator<HomeInfoResult> {
  key() {
    return 'HomeInfo:v2';
  }

  getKeepAliveOptions(key: string): KeepAliveOptions {
    return {
      aggregatorKey: key,
      aggregatorArgs: undefined,
      interval: 10 * 60 // 10 minutes,
    };
  }

  async setter(): Promise<AggregatorSetterResult<HomeInfoResult>> {
    
    const [counts, nameOperations] = await Promise.all([
      totalNamesAggregator.fetch(),
      nameOpsAggregator.fetch({page: 0}),
    ]);

    const blockHeight = await getLatestBlockHeight();
    const nameOperationsOverTime = await getRecentNameGrowth(blockHeight, counts.subdomains);

    const totalSupplyInfo: TotalSupplyResult = await totalSupplyAggregator.fetch();
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

const homeInfoAggregator = new HomeInfo();
export { homeInfoAggregator };

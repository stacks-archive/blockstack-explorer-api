import * as c32check from 'c32check';
import { Aggregator, AggregatorSetterResult } from './aggregator';
import { getUnlockedSupply, getTopBalances } from '../core-db-pg/queries';
import { microStacksToStacks } from '../utils';

export type TopBalanceAccount = {
  stxAddress: string;
  btcAddress: string;
  balance: string;
  distribution: number;
};

export type TopBalancesAggregatorOpts = {
  count: number;
};

class TopBalancesAggregator extends Aggregator<TopBalanceAccount[], TopBalancesAggregatorOpts> {
  key({ count }: TopBalancesAggregatorOpts) {
    return `${this.constructor.name}:${count}`;
  }

  expiry() {
    return 10 * 60; // 10 minutes
  }

  async setter({count}: TopBalancesAggregatorOpts): Promise<AggregatorSetterResult<TopBalanceAccount[]>> {
    const { unlockedSupply } = await getUnlockedSupply();
    const topBalances = await getTopBalances(count);
    const result = topBalances.map(account => ({
      stxAddress: c32check.b58ToC32(account.address),
      btcAddress: account.address,
      balance: microStacksToStacks(account.balance),
      distribution: parseFloat(account.balance.div(unlockedSupply).multipliedBy(100).toFixed(6)),
    }));
    return {
      shouldCacheValue: true,
      value: result,
    };
  }
}

const topBalancesAggregator = new TopBalancesAggregator();
export { topBalancesAggregator };

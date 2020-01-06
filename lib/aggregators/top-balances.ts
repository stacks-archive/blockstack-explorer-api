import * as c32check from 'c32check';
import { AggregatorWithArgs } from './aggregator';
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
}

class TopBalancesAggregator extends AggregatorWithArgs<TopBalanceAccount[], TopBalancesAggregatorOpts> {
  key({ count }: TopBalancesAggregatorOpts) {
    return `${this.constructor.name}:${count}`;
  }

  expiry() {
    return 10 * 60; // 10 minutes
  }

  async setter({count}: TopBalancesAggregatorOpts): Promise<TopBalanceAccount[]> {
    const { unlockedSupply } = await getUnlockedSupply();
    const topBalances = await getTopBalances(count);
    return topBalances.map(account => ({
      stxAddress: c32check.b58ToC32(account.address),
      btcAddress: account.address,
      balance: microStacksToStacks(account.balance),
      distribution: parseFloat(account.balance.div(unlockedSupply).multipliedBy(100).toFixed(6)),
    }));
  }
}

export default new TopBalancesAggregator();

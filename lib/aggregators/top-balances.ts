import Aggregator from './aggregator';
import { getUnlockedSupply, getTopBalances } from '../core-db-pg/queries';
import { microStacksToStacks } from '../utils';

export interface TopBalanceAccount {
  address: string;
  balance: string;
  distribution: number;
}

class TopBalancesAggregator extends Aggregator {
  static key(count: number) {
    return `${this.name}:${count}`;
  }

  static expiry() {
    return 10 * 60; // 10 minutes
  }

  static async setter(count: number): Promise<TopBalanceAccount[]> {
    const { unlockedSupply } = await getUnlockedSupply();
    const topBalances = await getTopBalances(count);
    return topBalances.map(account => ({
      address: account.address,
      balance: microStacksToStacks(account.balance),
      distribution: parseFloat(account.balance.div(unlockedSupply).multipliedBy(100).toFixed(6)),
    }));
  }
}

export default TopBalancesAggregator;

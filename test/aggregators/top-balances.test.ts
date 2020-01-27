import '../setup';
import TopBalancesAggregator, { TopBalanceAccount } from '../../lib/aggregators/top-balances';

test('get top balances', async () => {
  const { value: balances } = await TopBalancesAggregator.setter({count: 500});
  expect(balances.length).toEqual(500);
  expect(balances[0].stxAddress).toBeTruthy();
  expect(balances[0].btcAddress).toBeTruthy();
  expect(parseFloat(balances[0].balance)).toBeGreaterThan(1);
  const totalDistribution = balances.reduce((total, account) => total + account.distribution, 0);
  // Sanity check on the combined distribution percentages of the top accounts
  expect(totalDistribution).toBeGreaterThan(50);
});

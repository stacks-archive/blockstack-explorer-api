import '../setup';
import TotalSupplyAggregator from '../../lib/aggregators/total-supply';

test('get total supply', async () => {
  const { value: totalSupplyInfo } = await TotalSupplyAggregator.setter();
  expect(parseFloat(totalSupplyInfo.blockHeight)).toBeGreaterThan(1);
  expect(parseFloat(totalSupplyInfo.totalStacks)).toBeGreaterThan(1);
  expect(parseFloat(totalSupplyInfo.unlockedSupply)).toBeGreaterThan(1);
  expect(parseFloat(totalSupplyInfo.unlockedPercent)).toBeGreaterThan(1);
});

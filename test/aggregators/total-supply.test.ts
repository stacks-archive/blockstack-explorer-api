import '../setup';
import TotalSupplyAggregator, { TotalSupplyResult } from '../../lib/aggregators/total-supply';

test('get total supply', async () => {
  const totalSupplyInfo: TotalSupplyResult = await TotalSupplyAggregator.setter();
  expect(parseFloat(totalSupplyInfo.blockHeight)).toBeGreaterThan(1);
  expect(parseFloat(totalSupplyInfo.totalStacks)).toBeGreaterThan(1);
  expect(parseFloat(totalSupplyInfo.unlockedSupply)).toBeGreaterThan(1);
  expect(parseFloat(totalSupplyInfo.unlockedPercent)).toBeGreaterThan(1);
});

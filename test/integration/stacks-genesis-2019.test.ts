import '../setup';
import { getGenesis2019AddressInfo } from '../../controllers/v2-controller';

test('fetch valid genesis-2019 address info', async () => {
  const stxAddress = 'SP2G61YBH4GTWD6FRR5BA760J2ETS8F9618YG3XN2';
  const result = await getGenesis2019AddressInfo(stxAddress);
  expect(result).toBeTruthy();
  // smoke tests on the values generated from the original JSON source
  expect(result.accounts[0].totalFormatted).toBeTruthy();
  expect(result.accounts[0].unlockUntil).toBeTruthy();
  expect(result.accounts[0].unlockPerMonthFormatted).toBeTruthy();
  expect(result.totalFormatted).toBeTruthy();
  expect(result.total).toBeGreaterThan(1);
});

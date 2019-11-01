import '../setup';
import {
  getRecentSubdomains,
  getRecentNames,
  getStacksHolderCount,
  getRecentStacksTransfers,
} from '../../lib/core-db/queries';

test('it can get subdomains', async () => {
  const subdomains = await getRecentSubdomains(20);
  expect(subdomains.length).toEqual(20);
  expect(subdomains[0].name).not.toBeFalsy();
});

test('can fetch recent names', async () => {
  const names = await getRecentNames(15);
  expect(names.length).toEqual(15);
  expect(names[0].name).not.toBeFalsy();
});

test('can fetch number of stacks holders', async () => {
  const count = await getStacksHolderCount();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeGreaterThan(1000);
});

test('can fetch recent stacks transfers', async () => {
  const transfers = await getRecentStacksTransfers(12);
  expect(transfers.length).toEqual(12);
});

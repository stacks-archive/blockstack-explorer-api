import '../setup';
import { getDB, DB, getAll } from '../../lib/core-db';

test('it can get a DB', async () => {
  const subdomains = getDB(DB.Subdomains);
  expect(subdomains.get).not.toBeNull();
});

test('it can run a query on blockstack-server', async () => {
  const sql = 'SELECT * from accounts LIMIT 10;';
  const allAccounts = await getAll(DB.Blockstack, sql, {});
  expect(allAccounts.length).toEqual(10);
});

test('it can run a query on subdomains', async () => {
  const sql =
    'select * from subdomain_records ORDER BY block_height DESC LIMIT 10;';
  const recentSubdomains = await getAll(DB.Subdomains, sql);
  expect(recentSubdomains.length).toEqual(10);
});

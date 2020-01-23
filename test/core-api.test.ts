import './setup';
import {
  fetchName,
  fetchAddress,
} from '../lib/client/core-api';

jest.setTimeout(10000);

describe('fetchName', () => {
  test('fetches a profile', async t => {
    const user = await fetchName('hankstoever');
    // console.log(user)
    expect(user.profile.name).toBe('Hank Stoever');
    t();
  });

  test('it works with .id', async t => {
    const user = await fetchName('hankstoever');
    // console.log(user)
    expect(user.profile.name).toBe('Hank Stoever');
    t();
  });

  test('resolves to null when no match', async t => {
    const user = await fetchName('notarealid');
    expect(user).toBeNull();
    t();
  });
});

test('fetches an address', async t => {
  const address = await fetchAddress('1G8XTwZkUzu7DJYDW4oA4JX5shnW8LcpC2');
  expect(address.btcBalanceInfo.totalReceived - address.btcBalanceInfo.totalSent).toBe(address.btcBalanceInfo.balance);
  expect(address.btcBalanceInfo.totalTransactions).toBeGreaterThan(10);
  expect(address.blockstackCoreData.names[0]).toEqual('hankstoever.id');
  t();
});

// TODO: replace with equivalent tests for block-v2 sources
/*
test.skip('fetches block info', async () => {
  const hash =
    '00000000000000000010eb9ebfa53e0938a8247e8309d1abc026d8f82eecfb67';
  const height = 550348;
  const block = await fetchBlock(height);
  expect(block.nameOperations.length).toBe(1);
  expect(block.hash).toBe(hash);
  expect(block.height).toBe(height);
  expect(block.time).toBe(1542400531);
  expect(block.txCount).toBe(2862);

  const [tx] = block.transactions;
  expect(tx.vin.length).toBe(1);
  expect(tx.vout.length).toBe(3);

  const lastTx = block.transactions[9];
  expect(lastTx.txid).toBe(
    '7b1e23e9e30669629b13335459dd6bb7ed50d5f6f5053fc84327279b3516809d'
  );

  const [nameOperation] = block.nameOperations;
  expect(nameOperation.opcode).toBe('NAME_UPDATE');
}, 30000);
*/

// TODO: replace with equivalent tests for blocks-v2 sources
/*
test.skip('fetches blocks on a date', async () => {
  const date = '2018-10-05';
  const blocks = await fetchBlocks(date);
  const [block] = blocks;
  expect(block.height).toEqual(544425);
  expect(block.hash).toEqual(
    '00000000000000000005128450e606b6df5360dfb091f2b4fd809f8647821967'
  );
  expect(block.time).toEqual(1538698836);
}, 10000);
*/

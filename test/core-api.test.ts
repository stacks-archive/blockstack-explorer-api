import './setup';
import {
  fetchName,
  fetchAddress,
  fetchTX,
  fetchBlock,
  fetchBlocks
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

test.skip('fetches a TX', async () => {
  const tx = await fetchTX(
    'b5eec33c42920752d60203eae6b1a9bddab18f1f88ba9999352b93589d70e530'
  );
  // console.log(tx);
  expect(tx.blockheight).toBe(517739);
  expect(tx.vout[0].scriptPubKey.hex).toBe(
    // eslint-disable-next-line max-len
    '6a3c69643a68616e6b73746f657665722e69640000000000000000000000000000000000000000000000daa4437cd303d5c751b62a4c25ece524889b0b81'
  );
  expect(tx.vin[0].addr).toBe('17kuBnomGz2mU5A5eKiA3a5MuadHUybWbC');
  expect(tx.value).toEqual(0.0027731);
  expect(tx.valueOut).toEqual(0.0027731);
});

test('fetches an older TX', async () => {
  const tx = await fetchTX(
    '7e08c36aaa53ae3fc87abfda55a6cd92de7dd723da3399ad274b614cb7d37874'
  );
  expect(tx.blockheight).toBe(332624);
  expect(tx.vout[0].scriptPubKey.hex).toBe(
    '76a9146b4b10e85549c2faee992947299f1058a771e97488ac'
  );
  expect(tx.vin[0].addr).toBe('15yxQGynajqqEQiGBoioe6ATp2n2LTBJ4V');
  expect(tx.value).toEqual(4.29555498);
  expect(tx.valueOut).toEqual(4.29555498);
}, 25000);

// TODO: replace with equivalent tests for block-v2 sources
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

// TODO: replace with equivalent tests for blocks-v2 sources
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

import * as moment from 'moment';
import '../setup';
import {
  getBlocks,
  getTX,
  getBlock,
  getBlockHash,
  getLatestBlock,
  getAddressTransactions,
  getAddressBtcBalance
} from '../../lib/bitcore-db/queries';

test('can fetch address txs', async () => {
  const bitcoreTXs = await getAddressTransactions('16iBt6f8ZhbutEE4sb1c2hZ8PHhVnabmv4', 0, Number.MAX_SAFE_INTEGER);
  const bitcoreTX = bitcoreTXs.find(t => t.txid === '7daa187ae06803d4def226503cbfee0b054dc4c4be07d203fa9c0445dd21d60d');

  expect(bitcoreTX.action).toBe('sent');
  expect(bitcoreTX.address).toBe('16iBt6f8ZhbutEE4sb1c2hZ8PHhVnabmv4');
  expect(bitcoreTX.blockHash).toBe('00000000000000000007bdef8e74912573d72f1793509e003f8bcb0c14c2901a');
  expect(bitcoreTX.blockHeight).toBe(606697);
  expect(bitcoreTX.confirmations).toBeGreaterThan(100);
  expect(bitcoreTX.blockTime).toBe(1575504925);
  expect(bitcoreTX.fee).toBe(1424);
  expect(bitcoreTX.totalTransferred).toBe(395584);
  expect(bitcoreTX.txid).toBe('7daa187ae06803d4def226503cbfee0b054dc4c4be07d203fa9c0445dd21d60d');
  expect(bitcoreTX.outputs).toEqual([
    {
      address: false,
      script: 'aidpZD8HJDHofkh30kk0hAH4ziPFnlUX/wOZsJXEG+PNxFtG5gWmcow=',
      value: 0 
    },
    {
      address: '16iBt6f8ZhbutEE4sb1c2hZ8PHhVnabmv4',
      script: 'dqkUPqLEL1HAtN/oSUFnCTll8pia+S+IrA==',
      value: 235584
    },
    {
      address: '1111111111111111111114oLvT2',
      script: 'dqkUAAAAAAAAAAAAAAAAAAAAAAAAAACIrA==',
      value: 160000
    }
  ]);
});

test('can fetch address balance', async () => {
  const result = await getAddressBtcBalance('16iBt6f8ZhbutEE4sb1c2hZ8PHhVnabmv4');
  expect(result.balance).toBeGreaterThan(0);
  expect(result.totalReceived).toBeGreaterThan(0);
  expect(result.totalSent).toBeGreaterThan(0);
  expect(result.totalTransactions).toBeGreaterThan(10);
});

test('can fetch blocks', async () => {
  const result = await getBlocks('2013-02-01');
  const blocks = result.blocks;
  const date = moment(blocks[0].time * 1000).utc();
  expect(date.format('YYYY-MM-DD')).toEqual('2013-02-01');
  expect(date.format('YYYY-MM-DD')).toEqual('2013-02-01');
  expect(blocks.length).toEqual(100);
  expect(blocks[0].txCount).toEqual(blocks[0].txCount);
}, 15000);

test('can fetch blocks with a page testonly', async () => {
  const result = await getBlocks('2013-02-01', 1);
  const blocks = result.blocks;
  const firstPageResult = await getBlocks('2013-02-01', 0);
  const firstPage = firstPageResult.blocks;
  expect(blocks[0].hash).not.toEqual(firstPage[firstPage.length - 1].hash);
}, 15000);

test('can fetch a TX', async () => {
  const tx = await getTX(
    '910c70050565c4ae17e65e5d487d3c5f17888ba14b672a5c21ec0f2cd8dabf79'
  );
  expect(tx.blockHash).toBe('00000000000000000001327c3a31a1718704ab2100248e167f01ff6aaa37f751');
  expect(tx.blockHeight).toBe(606704);
  expect(tx.blockTime).toBe(1575507813);
  expect(tx.confirmations).toBeGreaterThan(1000);
  expect(tx.fee).toBe(4416);
  expect(tx.size).toBe(276);
  expect(tx.txid).toBe('910c70050565c4ae17e65e5d487d3c5f17888ba14b672a5c21ec0f2cd8dabf79');
  expect(tx.value).toBe(395584);
  expect(tx.inputs).toEqual([
    {
      address: '16iBt6f8ZhbutEE4sb1c2hZ8PHhVnabmv4',
      value: 400000
    }
  ]);
  expect(tx.outputs).toEqual([
    {
      address: false, 
      script: "aidpZD8HJDHofkh30kk0hAH4ziPFnlUX/wOZsJXEG+PNxFtG5gWmcow=", 
      value: 0 
    },
    {
      address: "16iBt6f8ZhbutEE4sb1c2hZ8PHhVnabmv4", 
      script: "dqkUPqLEL1HAtN/oSUFnCTll8pia+S+IrA==", 
      value: 235584 
    },
    {
      address: "1111111111111111111114oLvT2", 
      script: "dqkUAAAAAAAAAAAAAAAAAAAAAAAAAACIrA==", 
      value: 160000 
    }
  ]);
  expect(tx.outputs.reduce((prev, cur) => cur.value + prev, 0)).toBe(tx.value);
});

test('can fetch a TX 2', async () => {
  const tx = await getTX(
    'df2b060fa2e5e9c8ed5eaf6a45c13753ec8c63282b2688322eba40cd98ea067a'
  );
  expect(tx.blockHeight).toEqual(4);
  expect(tx.value).toEqual(5000000000);
});

test('fetches block info', async () => {
  const hash =
    '0000000000000054ea07f09996ceda301f9fb94b268654779d53e9c7776b88b6';
  // const height = 550348;
  const block = await getBlock(hash);
  // console.log(block);
  // expect(block.nameOperations.length).toBe(1);
  expect(block.hash).toBe(hash);
  expect(block.height).toBe(219007);
  expect(block.time).toBe(1359678910);
  expect(block.txCount).toBe(775);

  // const [tx] = block.transactions;
  // expect(tx.vin.length).toBe(1);
  // expect(tx.vout.length).toBe(3);

  // const lastTx = block.transactions[9];
  // expect(lastTx.txid).toBe('7b1e23e9e30669629b13335459dd6bb7ed50d5f6f5053fc84327279b3516809d');

  // const [nameOperation] = block.nameOperations;
  // expect(nameOperation.opcode).toBe('NAME_UPDATE');
}, 10000);

test('fetches block hash from height', async () => {
  const height = '468495';
  const hash = await getBlockHash(height);
  expect(hash).toEqual(
    '0000000000000000009c052962ef3f85d174c5989ab86029415ee99bae53277c'
  );
});

test('fetches latest block', async () => {
  const block = await getLatestBlock();
  expect(typeof block.height).toEqual('number');
  expect(block.height).toBeGreaterThanOrEqual(578544);
});

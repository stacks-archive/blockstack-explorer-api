import moment from 'moment';
import '../setup';
import {
  getBlocks,
  getTX,
  getBlock,
  getBlockHash,
  getLatestBlock
} from '../../lib/bitcore-db/queries';

test('can fetch blocks', async () => {
  const blocks = await getBlocks('2013-02-01');
  // console.log(blocks[0]);
  const date = moment(blocks[0].time).utc();
  expect(date.format('YYYY-MM-DD')).toEqual('2013-02-01');
  const lastDate = moment(blocks[0].time).utc();
  expect(date.format('YYYY-MM-DD')).toEqual('2013-02-01');
  expect(blocks.length).toEqual(100);
}, 15000);

test('can fetch blocks with a page', async () => {
  const blocks = await getBlocks('2013-02-01', 1);
  const firstPage = await getBlocks('2013-02-01', 0);
  expect(blocks[0].hash).not.toEqual(firstPage[firstPage.length - 1].hash);
}, 15000);

test('can fetch a TX', async () => {
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

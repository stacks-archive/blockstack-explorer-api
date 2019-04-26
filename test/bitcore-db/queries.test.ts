import moment from 'moment';
import '../setup';
import { getBlocks, getTX } from '../../lib/bitcore-db/queries';

test('can fetch blocks', async () => {
  const blocks = await getBlocks('2013-02-01');
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
    'df2b060fa2e5e9c8ed5eaf6a45c13753ec8c63282b2688322eba40cd98ea067a',
  );
  expect(tx.blockHeight).toEqual(4);
  expect(tx.value).toEqual(5000000000);
});

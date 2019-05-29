import dotenv from 'dotenv';
import BluebirdPromise from 'bluebird';

import { getBlockByHeight } from '../lib/bitcore-db/queries';

const run = async () => {
  const topHeight = 578300;
  const runs = 100;
  const blocks: number[] = [];
  for (let height = topHeight - runs; height <= topHeight; height += 1) {
    // console.log(height);
    blocks.push(height);
  }

  const results = BluebirdPromise.map(blocks, async (height: number) => {
    const block = await getBlockByHeight(height);
    return block;
  }, { concurrency: 10 });
};

run().then(() => {
  console.log('done');
  process.exit();
}).then((error) => {
  console.error(error);
  process.exit();
});

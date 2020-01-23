import '../setup';
import { getNameOperationsForBlocks } from '../../lib/core-db-pg/queries';

test('query name ops for blocks', async () => {
  const blocks = new Array<number>(100);
  for (let i = 0; i < 100; i++) {
    blocks[i] = 608684 - i;
  }
  // TODO: complete test check
  const ff = await getNameOperationsForBlocks(blocks);
  // console.log(ff);
}, 100000);


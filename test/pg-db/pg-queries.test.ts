import '../setup';
import { getNameOperationsForBlocks } from '../../lib/core-db-pg/queries';

test('query name ops for blocks testonly', async () => {
  const blocks = new Array<number>(100);
  for (let i = 0; i < 100; i++) {
    blocks[i] = 608684 - i;
  }
  const ff = await getNameOperationsForBlocks(blocks);
  console.log(ff);
}, 100000);


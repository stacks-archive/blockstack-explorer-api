import '../setup';
import { getNameOperationCountsForBlocks, getNameOperationsForBlock } from '../../lib/core-db-pg/queries';

test('query name ops for blocks', async () => {
  const blocks: number[] = [];
  for (let i = 0; i < 10; i++) {
    blocks.push(608684 - i);
  }
  const counts = await getNameOperationCountsForBlocks(blocks);
  expect(counts).toEqual({
    608675: 452,
    608676: 301,
    608677: 300,
    608678: 900,
    608680: 427,
    608682: 284,
    608684: 1284
  });
}, 100000);


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

test('query name operations for block', async () => {
  const nameOps = await getNameOperationsForBlock(600514);
  expect(nameOps[0]).toMatchObject({
    name: 'vega_crux.id',
    owner: '1NERJZ9FqBgqdPzWxEnAnBRA85K5XA26hG',
  });
  expect(nameOps[1]).toMatchObject({
    name: 'waves_crux.id',
    owner: '1AFbrHh7w1R16SHt535f9wTiXpyUr1fyc1',
  });
  expect(nameOps[2]).toMatchObject({
    name: 'vslice_crux.id',
    owner: '19yzK2SxCbB8xzucwUfmUXVtSz67Wdb3oU',
  });
  expect(nameOps[3]).toMatchObject({
    name: 'wagecan_crux.id',
    owner: '1Ma3qjuPcizv4seBxGB5X9AnKwhf4jAizQ',
  });
  expect(nameOps[4]).toMatchObject({
    name: 'verto_crux.id',
    owner: '12MKMjr3mNMkFqn4amQjrGbvCz2zFSfvvq',
  });
  expect(nameOps[5]).toMatchObject({
    name: 'walletio_crux.id',
    owner: '17AMi1fCSWBopGKWYRuxNRJkxuT2i7wYTL',
  });
  expect(nameOps[6]).toMatchObject({
    name: 'wetez_crux.id',
    owner: '114pc7XQ5E5kSnNTfeGSLGbEkkSTTFBx9s',
  });
  expect(nameOps[7]).toMatchObject({
    name: 'sy_wu.dmails.id',
    owner: '1PDRD1GTvr3sk1T2XsAu5iYnsamF6yNvgV',
  });
});

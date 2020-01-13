import '../setup';
import { getAllNameOperations } from '../../lib/core-db-pg/queries';

test('get name opts', async () => {
  const nameOpts = await getAllNameOperations(0, 20);
  expect(nameOpts.length).toBe(20)
})

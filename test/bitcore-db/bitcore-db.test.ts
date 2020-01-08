import '../setup';

import { getDB } from '../../lib/bitcore-db';

test('it can get a DB', async () => {
  const db = await getDB();
  expect(typeof db.collection).not.toEqual("undefined");
});

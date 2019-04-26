import '../setup';

import { getDB } from '../../lib/bitcore-db';

test('it can get a DB', async () => {
  const db = await getDB();
  expect(db.collection).not.toBeFalsy();
});

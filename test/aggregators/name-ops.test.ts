import '../setup';
import { nameOpsAggregator } from '../../lib/aggregators/name-ops-v2';

test('sorts name ops by time', async () => {
  const { value: names } = await nameOpsAggregator.setter({ page: 0 });
  expect(names.length).toEqual(100);
  const firstName = names[0];
  expect(firstName.name).not.toBeFalsy();
  expect(firstName.time).not.toBeFalsy();
  expect(firstName.owner).not.toBeFalsy();

  let lastName = names[0];
  names.forEach(name => {
    if (lastName) {
      expect(lastName.time).toBeGreaterThanOrEqual(name.time);
    }
    lastName = name;
  });
}, 15000);

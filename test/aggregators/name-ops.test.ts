import '../setup';
import NameOpsAggregator from '../../lib/aggregators/name-ops';

test('can run the name-ops aggregator', async () => {
  const allNames = await NameOpsAggregator.setter(100, 0);
  expect(allNames.length).toEqual(100);
  const firstName = allNames[0];
  expect(firstName.name).not.toBeFalsy();
  expect(firstName.time).not.toBeFalsy();
  expect(firstName.owner).not.toBeFalsy();
});

test('sorts name ops by time', async () => {
  const names = await NameOpsAggregator.setter(100, 0);
  let lastName = names[0];
  names.forEach((name) => {
    if (lastName) {
      expect(lastName.time).toBeGreaterThanOrEqual(name.time);
    }
    lastName = name;
  });
});

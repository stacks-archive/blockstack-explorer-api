import '../setup';
import NameOpsAggregator from '../../lib/aggregators/name-ops';

test('can run the name-ops aggregator', async () => {
  const allNames = await NameOpsAggregator.setter();
  expect(allNames.length).toEqual(200);
  const firstName = allNames[0];
  expect(firstName.name).not.toBeFalsy();
  expect(firstName.date).not.toBeFalsy();
  expect(firstName.owner).not.toBeFalsy();
});

test('sorts name ops by time', async () => {
  const names = await NameOpsAggregator.setter();
  let lastName = names[0];
  names.forEach((name) => {
    if (lastName) {
      expect(lastName.date).toBeGreaterThanOrEqual(name.date);
    }
    lastName = name;
  });
});

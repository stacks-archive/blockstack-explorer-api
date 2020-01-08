import * as Sentry from '@sentry/node';
import NameOpsAggregator from '../lib/aggregators/name-ops';
import HomePageAggregator from '../lib/aggregators/home-info';
import NamespaceAggregator from '../lib/aggregators/namespaces';

if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
}

const run = async () => {
  await NameOpsAggregator.set();
  await NamespaceAggregator.set();
  await HomePageAggregator.set();
};

run()
  .catch(e => {
    console.error(e);
    process.exit();
  })
  .then(() => {
    console.log('Done!');
    process.exit();
  });

import * as Sentry from '@sentry/node';
import { homeInfoAggregator } from '../lib/aggregators/home-info';
import { namespaceAggregator } from '../lib/aggregators/namespaces';

if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
}

const run = async () => {
  await namespaceAggregator.set();
  await homeInfoAggregator.set();
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

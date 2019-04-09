const Sentry = require('@sentry/node');
const NameOpsAggregator = require('../lib/aggregators/name-ops');
const HomePageAggregator = require('../lib/aggregators/home-info');
const NamespaceAggregator = require('../lib/aggregators/namespaces');

if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
}

const run = async () => {
  await NameOpsAggregator.set();
  await NamespaceAggregator.set();
  await HomePageAggregator.set();
};

run()
  .catch((e) => {
    console.error(e);
    process.exit();
  })
  .then(() => {
    console.log('Done!');
    process.exit();
  });

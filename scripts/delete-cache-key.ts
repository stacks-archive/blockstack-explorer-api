import redis from '../lib/redis';
import BluebirdPromise from 'bluebird';

const prefix = process.argv[2];

const run = async () => {
  console.log(`Deleting with prefix: ${prefix}`);
  const env = process.env.NODE_ENV;
  const clientPrefix = `blockstack-explorer-${env}`;
  const keys = await redis.keysAsync(`${clientPrefix}${prefix}*`);
  await BluebirdPromise.map(keys, key =>
    redis.delAsync(key.slice(clientPrefix.length))
  );
  console.log(keys);
};

run()
  .catch(e => {
    console.error(e);
    process.exit();
  })
  .then(() => {
    console.log('Success!');
    process.exit();
  });

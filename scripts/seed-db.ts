import ora from 'ora';
import Bluebird from 'bluebird';
import { promisify } from 'util';
import { exec } from 'child_process';

const cmd = promisify(exec);

const steps = [
  {
    name: 'Pulling blockstack-core Docker image',
    cmd: 'docker pull quay.io/blockstack/blockstack-core:v21.0.0.2',
  },
  {
    name: 'Removing previous images',
    cmd: 'docker rm core-spinup',
    allowFail: true,
  },
  {
    name: 'Doing a fast-sync from a blockstack-core snapshot',
    cmd: 'docker run --name core-spinup quay.io/blockstack/blockstack-core:master blockstack-core fast_sync',
  },
  {
    name: 'Copying files from Docker image',
    cmd: 'docker cp core-spinup:/root/.blockstack-server/ /tmp/blockstack-server',
  },
  {
    name: 'Copying blockstack-server.db',
    cmd: 'cp /tmp/blockstack-server/blockstack-server.db ~/pgloader/srv/',
  },
  {
    name: 'Copying subdomains.db',
    cmd: 'cp /tmp/blockstack-server/subdomains.db ~/pgloader/srv/',
  },
  {
    name: 'Moving data from SQLite to Postgres image',
    cmd: 'sh scripts/sqlite-to-pg.sh',
  },
];

const run = async () => {
  await Bluebird.mapSeries(steps, async (step) => {
    const spinner = ora(step.name).start();
    try {
      await cmd(step.cmd);
    } catch (error) {
      if (!step.allowFail) {
        throw error;
      }
    }
    spinner.succeed();
  });
};

run().catch((e) => {
  console.error(e);
}).finally(() => {
  process.exit();
});

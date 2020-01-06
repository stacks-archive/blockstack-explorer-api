import * as dotenv from 'dotenv';
import { getRecentSubdomains } from '../lib/core-db-pg/queries';

dotenv.config();

const run = async () => {
  console.log(process.env.PG_DATABASE);
  const res = await getRecentSubdomains(10);
  console.log(res[0]);
};

run()
  .then(() => {
    process.exit();
  })
  .catch(e => {
    console.error(e);
    process.exit();
  });

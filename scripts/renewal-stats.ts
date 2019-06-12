import dotenv from 'dotenv';
import moment from 'moment';
import fs from 'fs';
import { getDB } from '../lib/core-db-pg';
import { blockToTime } from '../lib/utils';

dotenv.config();

interface Months {
  [month: string]: number,
}

const run = async () => {
  const sql = 'select * from name_records';
  const db = await getDB();
  const { rows } = await db.query(sql);
  const months: Months = {};
  rows.forEach((row) => {
    const time = blockToTime(row.last_renewed);
    const key = moment(time).format('YYYY-MM');
    if (months[key]) {
      months[key] += 1;
    } else {
      months[key] = 1;
    }
  });
  let csv = 'date,count';
  Object.keys(months).forEach((date) => {
    csv += `\n${date},${months[date]}`;
  });
  console.log(months);
  fs.writeFileSync('/Users/hank/blockstack/stacks-explorer-api/data/renewals.csv', csv);
};

run().then(() => {
  process.exit();
}).catch((e) => {
  console.error(e);
  process.exit();
});

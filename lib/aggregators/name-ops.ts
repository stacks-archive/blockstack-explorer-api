import sortBy from 'lodash/sortBy';
// import moment from 'moment';
// import flatten from 'lodash/flatten';
// import const ProgressBar from 'progress';
// import BluebirdPromise from 'bluebird';
// import MultiProgress from 'multi-progress';

import Aggregator from './aggregator';
import { getRecentNames, getRecentSubdomains } from '../core-db/queries';
import { blockToTime } from '../utils';
// import BlocksAggregator from './blocks';

interface CommonName {
  name: string;
  blockHeight: number;
  owner: string;
}

class NameOpsAggregator extends Aggregator {
  static async setter() {
    const [recentNames, recentSubdomains] = await Promise.all([
      getRecentNames(100),
      getRecentSubdomains(100),
    ]);

    let allNames: CommonName[] = recentNames.map(name => ({
      name: name.name,
      blockHeight: name.preorderBlockHeight,
      owner: name.address,
    }));

    allNames = allNames.concat(recentSubdomains.map(subdomain => ({
      name: subdomain.name,
      blockHeight: subdomain.blockHeight,
      owner: subdomain.owner,
    })));

    allNames = sortBy(allNames, name => -name.blockHeight);

    return allNames.map((name) => {
      const date = blockToTime(name.blockHeight);
      return {
        date,
        ...name,
      };
    });

    // const daysBack = Array(...new Array(2)).map((val, i) => i);
    // const dates = daysBack.map((x, index) => moment()
    //   .utc()
    //   .subtract(index, 'days')
    //   .format('YYYY-MM-DD'));
    // const multi = new MultiProgress(process.stderr);
    // const blocks = flatten(await BluebirdPromise.map(dates, async (date) => {
    //   const block = await BlocksAggregator.set(date, multi);
    //   return block;
    // }));

    // let nameOps = blocks.map(({ nameOperations, ...block }) => {
    //   if (!nameOperations) return [];
    //   const newNames = nameOperations.filter(op => op.opcode === 'NAME_REGISTRATION');
    //   const subdomains = nameOperations.map(nameOp => nameOp.subdomains || []);
    //   const ops: any[] = flatten(newNames.concat(subdomains));
    //   ops.forEach((op, index) => {
    //     ops[index].time = block.time * 1000;
    //     ops[index].name = op.name || op.fully_qualified_subdomain;
    //   });
    //   return ops;
    // });

    // nameOps = flatten(nameOps);
    // // nameOps = sort(nameOps, op => -op.block_height);

    // return nameOps;
  }
}

export default NameOpsAggregator;

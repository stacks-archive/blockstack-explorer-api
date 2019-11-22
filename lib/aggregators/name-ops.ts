import sortBy from 'lodash/sortBy';
// import moment from 'moment';
// import flatten from 'lodash/flatten';
// import const ProgressBar from 'progress';
// import BluebirdPromise from 'bluebird';
// import MultiProgress from 'multi-progress';

import Aggregator from './aggregator';
import { getRecentNames, getRecentSubdomains } from '../core-db-pg/queries';
import { blockToTime } from '../utils';
// import BlocksAggregator from './blocks';

interface CommonName {
  name: string;
  blockHeight: number;
  owner: string;
}

class NameOpsAggregator extends Aggregator {
  static key(limit = 100, page = 0) {
    return `NameOpsAggregator:limit=${limit}:page=${page}`;
  }

  static async setter(limit: number, page = 0) {
    const [recentSubdomains] = await Promise.all([
      // getRecentNames(100),
      getRecentSubdomains(100)
    ]);

    // let allNames: CommonName[] = recentNames.map(name => ({
    //   name: name.name,
    //   blockHeight: name.preorderBlockHeight,
    //   owner: name.address,
    // }));

    let allNames = recentSubdomains.map(subdomain => ({
      name: subdomain.name,
      blockHeight: subdomain.blockHeight,
      owner: subdomain.owner
    }));

    allNames = sortBy(allNames, name => -name.blockHeight);

    return allNames.map(name => {
      const time = blockToTime(name.blockHeight as number);
      return {
        time,
        ...name
      };
    });
  }
}

export default NameOpsAggregator;

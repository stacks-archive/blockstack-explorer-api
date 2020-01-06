import { sortBy } from 'lodash';
// import moment from 'moment';
// import flatten from 'lodash/flatten';
// import const ProgressBar from 'progress';
// import BluebirdPromise from 'bluebird';
// import MultiProgress from 'multi-progress';

import { AggregatorWithArgs } from './aggregator';
import { getRecentNames, getRecentSubdomains } from '../core-db-pg/queries';
import { blockToTime } from '../utils';
// import BlocksAggregator from './blocks';

type NameOpsAggregatorResult = {
  name: string;
  blockHeight: string | number;
  owner: string;
  time: number;
}[];

type NameOpsAggregatorOpts = {
  limit?: number;
  page?: number;
};

class NameOpsAggregator extends AggregatorWithArgs<NameOpsAggregatorResult, NameOpsAggregatorOpts> {
  key({ limit = 100, page = 0 }: NameOpsAggregatorOpts) {
    return `NameOpsAggregator:limit=${limit}:page=${page}`;
  }

  async setter({ limit = 100, page = 0}: NameOpsAggregatorOpts) {
    const [recentSubdomains] = await Promise.all([
      getRecentSubdomains(limit, page)
    ]);

    let allNames = recentSubdomains.map(subdomain => ({
      name: subdomain.name,
      blockHeight: subdomain.blockHeight,
      owner: subdomain.owner
    }));

    allNames = sortBy(allNames, name => -name.blockHeight);

    return allNames.map(name => {
      const time = blockToTime(name.blockHeight);
      return {
        time,
        ...name
      };
    });
  }
}

export default new NameOpsAggregator();

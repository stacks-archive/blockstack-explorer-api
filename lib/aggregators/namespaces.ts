import * as BluebirdPromise from 'bluebird';

import { Aggregator } from './aggregator';

import { fetchNamespaceNameCount, fetchNamespaces } from '../client/core-api';

type NamespaceAggregatorResult = {
  total: number;
  namespaces: {
    namespace: string;
    count: number;
  }[];
};

class NamespaceAggregator extends Aggregator<NamespaceAggregatorResult> {
  async setter() {
    const namespaces = await fetchNamespaces();
    const counts = await BluebirdPromise.map(namespaces, async (namespace: string) => {
      const count = await fetchNamespaceNameCount(namespace);
      return {
        namespace,
        count: count.names_count
      };
    });
    const total = counts.reduce(
      (cumulative, namespace) => cumulative + namespace.count,
      0
    );
    const data = {
      total,
      namespaces: counts
    };
    return data;
  }

  expiry() {
    return 60 * 60; // 1 hour
  }
}

export default new NamespaceAggregator();

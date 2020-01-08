import BluebirdPromise from 'bluebird';

import Aggregator from './aggregator';

import { fetchNamespaceNameCount, fetchNamespaces } from '../client/core-api';

class NamespaceAggregator extends Aggregator {
  static async setter() {
    const namespaces = await fetchNamespaces();
    const counts = await BluebirdPromise.map(namespaces, async namespace => {
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

  static expiry() {
    return 60 * 60; // 1 hour
  }
}

module.exports = NamespaceAggregator;
export default NamespaceAggregator;

const Promise = require('bluebird');

const Aggregator = require('./aggregator');

const { fetchNamespaceNameCount, fetchNamespaces } = require('../client/core-api');

class NamespaceAggregator extends Aggregator {
  static async setter() {
    const namespaces = await fetchNamespaces();
    const counts = await Promise.map(namespaces, async (namespace) => {
      const count = await fetchNamespaceNameCount(namespace);
      return {
        namespace,
        count: count.names_count,
      };
    });
    const total = counts.reduce(((cumulative, namespace) => cumulative + namespace.count), 0);
    const data = {
      total,
      namespaces: counts,
    };
    return data;
  }

  static expiry() {
    return 60 * 60; // 1 hour
  }
}

module.exports = NamespaceAggregator;

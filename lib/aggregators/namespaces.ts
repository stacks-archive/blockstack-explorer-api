import * as BluebirdPromise from 'bluebird';

import { AggregatorSetterResult, Aggregator, KeepAliveOptions } from './aggregator';

import { fetchNamespaceNameCount, fetchNamespaces } from '../client/core-api';

type NamespaceAggregatorResult = {
  total: number;
  namespaces: {
    namespace: string;
    count: number;
  }[];
};

class NamespaceAggregator extends Aggregator<NamespaceAggregatorResult> {
  async setter(): Promise<AggregatorSetterResult<NamespaceAggregatorResult>> {
    // TODO: refactor to use pg query rather than core node API
    const namespaces = await fetchNamespaces();
    const counts = await BluebirdPromise.map(namespaces, async (namespace: string) => {
      // TODO: refactor to use pg query rather than core node API
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
    return {
      shouldCacheValue: true,
      value: data,
    };
  }

  async getInitialKeepAliveOptions(): Promise<KeepAliveOptions> {
    return {
      aggregatorKey: await this.keyWithTag(),
      aggregatorArgs: undefined,
      interval: 30 * 60 // 30 minutes,
    };
  }

  expiry() {
    return 60 * 60; // 1 hour
  }
}

export default new NamespaceAggregator();

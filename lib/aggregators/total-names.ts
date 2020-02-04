import * as accounting from 'accounting';
import { AggregatorSetterResult, Aggregator } from './aggregator';

import { fetchTotalNames } from '../client/core-api';
import { getTotalSubdomainCount } from '../core-db-pg/queries';

export type TotalNamesResult = {
  namesFormatted: string;
  totalFormatted: string;
  subdomainsFormatted: string;
  names: number;
  subdomains: number;
  total: number;
};

class TotalNames extends Aggregator<TotalNamesResult> {
  async setter(): Promise<AggregatorSetterResult<TotalNamesResult>> {
    const [namesCount, subdomainsCount] = await Promise.all([
      // TODO: replace with pg-based getTotalNameCount() when ready
      fetchTotalNames(),
      getTotalSubdomainCount()
    ]);
    const totals = {
      names: namesCount.names_count,
      subdomains: subdomainsCount,
      total: namesCount.names_count + subdomainsCount
    };
    const result = {
      ...totals,
      namesFormatted: accounting.formatNumber(totals.names),
      totalFormatted: accounting.formatNumber(totals.total),
      subdomainsFormatted: accounting.formatNumber(totals.subdomains)
    };
    return {
      shouldCacheValue: true,
      value: result,
    };
  }

  expiry() {
    return 60 * 10; // 10 minutes
  }
}

export default new TotalNames();

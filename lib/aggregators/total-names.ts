import * as accounting from 'accounting';
import { Aggregator } from './aggregator';

import { fetchTotalNames, fetchTotalSubdomains } from '../client/core-api';

export type TotalNamesResult = {
  namesFormatted: string;
  totalFormatted: string;
  subdomainsFormatted: string;
  names: any;
  subdomains: any;
  total: any;
};

class TotalNames extends Aggregator<TotalNamesResult> {
  async setter() {
    const [names, subdomains] = await Promise.all([
      fetchTotalNames(),
      fetchTotalSubdomains()
    ]);
    const totals = {
      names: names.names_count,
      subdomains: subdomains.names_count,
      total: names.names_count + subdomains.names_count
    };
    return {
      ...totals,
      namesFormatted: accounting.formatNumber(totals.names),
      totalFormatted: accounting.formatNumber(totals.total),
      subdomainsFormatted: accounting.formatNumber(totals.subdomains)
    };
  }

  expiry() {
    return 60 * 10; // 10 minutes
  }
}

export default new TotalNames();

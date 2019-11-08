import accounting from 'accounting';
import Aggregator from './aggregator';

import { fetchTotalNames, fetchTotalSubdomains } from '../client/core-api';

class TotalNames extends Aggregator {
  static async setter() {
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

  static expiry() {
    return 60 * 10; // 10 minutes
  }
}

module.exports = TotalNames;
export default TotalNames;

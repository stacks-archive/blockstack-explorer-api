import * as request from 'request-promise';
import { Aggregator } from './aggregator';

class FeeEstimator extends Aggregator<number> {
  async setter() {
    const uri = 'https://bitcoinfees.earn.com/api/v1/fees/recommended';
    const { fastestFee } = await request({
      uri,
      json: true
    });
    return Math.ceil(fastestFee * 1.25);
  }

  expiry() {
    return 60 * 10; // 10 minutes
  }
}

export default new FeeEstimator();

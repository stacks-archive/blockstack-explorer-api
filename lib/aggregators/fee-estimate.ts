import * as request from 'request-promise-native';
import { Aggregator, AggregatorSetterResult } from './aggregator';

class FeeEstimator extends Aggregator<number> {
  async setter(): Promise<AggregatorSetterResult<number>> {
    const uri = 'https://bitcoinfees.earn.com/api/v1/fees/recommended';
    const { fastestFee } = await request({
      uri,
      json: true
    });
    return {
      shouldCacheValue: true,
      value: Math.ceil(fastestFee * 1.25),
    };
  }

  expiry() {
    return 60 * 10; // 10 minutes
  }
}

export default new FeeEstimator();

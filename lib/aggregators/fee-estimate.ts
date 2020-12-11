import * as request from 'request-promise-native';
import { AggregatorSetterResult, Aggregator } from './aggregator';

class FeeEstimator extends Aggregator<number> {
  async setter(): Promise<AggregatorSetterResult<number>> {
    const uri = 'https://bitcoinfees.earn.com/api/v1/fees/recommended';
    const { fastestFee } = await request({
      uri,
      json: true
    });
    return {
      shouldCacheValue: true,
      value: Math.ceil(fastestFee * 1.5),
    };
  }

  expiry() {
    return 60 * 10; // 10 minutes
  }
}

const feeEstimatorAggregator = new FeeEstimator();
export { feeEstimatorAggregator };

import request from 'request-promise';
import Aggregator from './aggregator';

export default class FeeEstimator extends Aggregator {
  static async setter() {
    const uri = 'https://bitcoinfees.earn.com/api/v1/fees/recommended';
    const { fastestFee } = await request({
      uri,
      json: true,
    });
    return fastestFee * 1.25;
  }

  static expiry() {
    return 60 * 10; // 10 minutes
  }
}

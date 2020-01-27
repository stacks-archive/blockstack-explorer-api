import * as request from 'request-promise-native';
import { Aggregator, AggregatorSetterResult } from './aggregator';

interface Slug {
  id: number;
  value: string;
}

interface App {
  id: number;
  website: string;
  imgixImageUrl: string;
  name: string;
  authentication: string;
  Slugs: Slug[];
}

export type BlockstackApp = {
  id: number;
  website: string;
  imgixImageUrl: string;
  name: string;
  slug: string | null;
};

class AppsAggregator extends Aggregator<BlockstackApp[]>{
  async setter(): Promise<AggregatorSetterResult<BlockstackApp[]>> {
    const { apps: appsList } = await request({
      uri: 'https://api.app.co/api/apps',
      json: true
    });
    const filtered = (appsList as App[]).filter(
      app => app.authentication === 'Blockstack'
    );
    const apps = filtered.map(
      ({ id, website, imgixImageUrl, name, Slugs }) => ({
        id,
        website,
        imgixImageUrl,
        name,
        slug: Slugs[0] ? Slugs[0].value : null
      })
    );
    const result = apps as BlockstackApp[];
    return {
      shouldCacheValue: true,
      value: result,
    };
  }

  expiry() {
    return 60 * 60 * 4; // 4 hours
  }
}

export default new AppsAggregator();

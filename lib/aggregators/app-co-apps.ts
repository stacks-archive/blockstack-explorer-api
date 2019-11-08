import request from 'request-promise';
import Aggregator from './aggregator';

interface Slug {
  id: number
  value: string
}

interface App {
  id: number
  website: string
  imgixImageUrl: string
  name: string
  authentication: string
  Slugs: Slug[]
}

export interface BlockstackApp {
  id: number
  website: string
  imgixImageUrl: string
  name: string
  slug: string | null
}

export default class AppsAggregator extends Aggregator {
  static async setter() {
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
    return apps as BlockstackApp[];
  }

  static expiry() {
    return 60 * 60 * 4; // 4 hours
  }
}

import { validateProofs } from 'blockstack/lib/profiles/profileProofs';
import { AggregatorWithArgs } from './aggregator';
import { fetchName, FetchNameEntry } from '../client/core-api';
import AppsAggregator, { BlockstackApp } from './app-co-apps';
import { extractRootDomain } from '../utils';
import { getNameHistory, NameHistoryResult } from '../core-db-pg/queries';
import { getTimesForBlockHeights } from '../bitcore-db/queries';

type UserApps = {
  [appUrl: string]: string;
}

type NameAggregatorResult = {
  nameRecord: (NameHistoryResult & { time: number })[];
  userApps: {
    listed: BlockstackApp[];
    unlisted: string[];
  };
  proofs?: any[];
} & Partial<FetchNameEntry>;

type NameAggregatorInput = {
  name: string;
  historyPage?: number;
};

class NameAggregator extends AggregatorWithArgs<NameAggregatorResult, NameAggregatorInput> {
  key({ name, historyPage = 0 }: NameAggregatorInput) {
    return `Name:${name}?historyPage=${historyPage}`;
  }

  getAppsArray(apps: BlockstackApp[], userApps: UserApps = {}) {
    const domains = Object.keys(userApps).map(domain =>
      extractRootDomain(domain)
    );
    const applist: BlockstackApp[] = [];
    const appsNotOnAppco: string[] = [];
    domains.forEach(domain => {
      const app = apps.find(appco => appco.website.includes(domain));
      if (app) applist.push(app);
      if (!app) appsNotOnAppco.push(domain);
    });
    return {
      listed: [...new Set(applist)],
      unlisted: appsNotOnAppco
    };
  }

  async setter({ name, historyPage = 0 }: NameAggregatorInput): Promise<NameAggregatorResult> {
    const [person, nameRecord] = await Promise.all([
      fetchName(name),
      getNameHistory(name, historyPage),
    ]);
    let proofs;
    let userApps: {
      listed: BlockstackApp[];
      unlisted: string[];
    };

    const nameRecordBlockHeights = nameRecord.map(record => record.block_id);
    const blockTimes = await getTimesForBlockHeights(nameRecordBlockHeights);
    const nameRecordWithTimes = nameRecord.map(record => {
      const time = blockTimes[record.block_id];
      const result = {
        ...record,
        time
      };
      return result
    });

    if (person) {
      const { profile } = person;
      const ownerAddress = person.ownerAddress || person.owner_address;
      proofs = await validateProofs(profile, ownerAddress, name);
      try {
        proofs.forEach(proof => {
          const { service } = proof;
          profile.account.forEach((account: any, index: number) => {
            if (account.service !== service) return false;
            person.profile.account[index].verified = proof.valid;
            return true;
          });
        });
      } catch (error) {
        console.error(error);
        // move on
      }
      // userApps = this.getAppsArray(appsList, profile.apps);
    }
    return {
      nameRecord: nameRecordWithTimes,
      userApps,
      proofs,
      ...person
    };
  }

  expiry() {
    return 60; // 1 minute
  }
}

export default new NameAggregator();

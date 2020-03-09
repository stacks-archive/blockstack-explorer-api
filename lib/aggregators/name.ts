import { validateProofs } from 'blockstack/lib/profiles/profileProofs';
import { Aggregator, AggregatorSetterResult } from './aggregator';
import { fetchName, FetchNameEntry } from '../client/core-api';
import { BlockstackApp } from './app-co-apps';
import { extractRootDomain, logError } from '../utils';
import { getNameHistory } from '../core-db-pg/queries';
import { getTimesForBlockHeights } from '../bitcore-db/queries';
import { getAddr as getBtcAddr } from '../btc-tx-decoder';

type UserApps = {
  [appUrl: string]: string;
}

type NameAggregatorResult = {
  nameRecord: {
    time: number;
    opcode: string;
    block_id: number;
    txid: string;
    name: string;
    owner: string;
    address: string;
    sender: string;
  }[];
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

class NameAggregator extends Aggregator<NameAggregatorResult, NameAggregatorInput> {
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

  async setter({ name, historyPage = 0 }: NameAggregatorInput): Promise<AggregatorSetterResult<NameAggregatorResult>> {
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
        sender: getBtcAddr(Buffer.from(record.sender, 'hex')),
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
        logError('Error validating proofs in name aggregator', error);
        // move on
      }
      // userApps = this.getAppsArray(appsList, profile.apps);
    }
    const result = {
      nameRecord: nameRecordWithTimes,
      userApps,
      proofs,
      ...person
    };
    return {
      shouldCacheValue: true,
      value: result,
    };
  }

  expiry() {
    return 60; // 1 minute
  }
}

const nameAggregator = new NameAggregator();
export { nameAggregator };

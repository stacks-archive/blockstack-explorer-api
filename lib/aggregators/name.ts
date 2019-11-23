import { validateProofs } from 'blockstack/lib/profiles/profileProofs';
import Aggregator from './aggregator';
import { fetchName, fetchNameRecord } from '../client/core-api';
import AppsAggregator, { BlockstackApp } from './app-co-apps';
import { extractRootDomain } from '../utils';
import { getNameHistory } from '../core-db-pg/queries';

interface UserApp {
  [key: string]: string,
}

class NameAggregator extends Aggregator {
  static key(name: string, historyPage = 0) {
    return `Names:${name}?historyPage=${historyPage}`;
  }

  static getAppsArray(apps: BlockstackApp[], userApps: UserApp[] = []) {
    const domains = Object.keys(userApps).map(domain => extractRootDomain(domain));
    const applist: BlockstackApp[] = [];
    const appsNotOnAppco: string[] = [];
    domains.forEach((domain) => {
      const app = apps.find(appco => appco.website.includes(domain));
      if (app) applist.push(app);
      if (!app) appsNotOnAppco.push(domain);
    });
    return {
      listed: [...new Set(applist)],
      unlisted: appsNotOnAppco,
    };
  }

  static async setter(name: string, historyPage = 0) {
    const [person, nameRecord] = await Promise.all([
      fetchName(name),
      getNameHistory(name),
    ]);
    let proofs;
    const userApps = {
      listed: [],
      unlisted: [],
    };
    if (person) {
      const { ownerAddress, profile } = person;
      proofs = await validateProofs(profile, ownerAddress, name);
      try {
        proofs.forEach((proof) => {
          const { service } = proof;
          profile.account.forEach((account, index) => {
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
      nameRecord,
      userApps,
      proofs,
      ...person,
    };
  }

  static expiry() {
    return 60; // 1 minute
  }
}

module.exports = NameAggregator;
export default NameAggregator;

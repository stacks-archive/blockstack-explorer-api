const { validateProofs } = require('blockstack/lib/profiles/profileProofs');
const Aggregator = require('./aggregator');
const { fetchName, fetchNameRecord } = require('../client/core-api');

class NameAggregator extends Aggregator {
  static key(name, historyPage = 0) {
    return `Names:${name}?historyPage=${historyPage}`;
  }

  static async setter(name, historyPage = 0) {
    const [person, nameRecord] = await Promise.all([fetchName(name), fetchNameRecord(name, historyPage)]);
    let proofs;
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
    }
    return {
      nameRecord,
      proofs,
      ...person,
    };
  }

  static expiry() {
    return 60; // 1 minute
  }
}

module.exports = NameAggregator;

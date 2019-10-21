import Promise from 'bluebird';
import * as c32check from 'c32check';
import moment from 'moment';
import compact from 'lodash/compact';
import accounting from 'accounting';

import Aggregator from './aggregator';
import {
  network, fetchRawTxInfo, fetchBlockHash, fetchBlockInfo,
} from '../client/core-api';
import { decode } from '../stacks-decoder';
import { stacksValue, blockToTime } from '../utils';
import { getTimesForBlockHeights } from '../bitcore-db/queries';
import { getVestingTotalForAddress } from '../core-db-pg/queries';

import { getAccounts } from '../addresses';

class StacksAddress extends Aggregator {
  static key(addr) {
    return `StacksAddress:${addr}`;
  }

  static async setter(addr) {
    const { accountsByAddress } = await getAccounts();
    let genesisData = {};
    if (accountsByAddress[addr]) {
      genesisData = this.formatGenesisAddress(accountsByAddress[addr]);
    }

    const address = c32check.c32ToB58(addr);
    const token = 'STACKS';

    const [{ tokens }, [history, totalUnlocked], status, balance, vestingTotal] = await Promise.all([
      network.getAccountTokens(address),
      this.getHistory(address),
      network.getAccountStatus(address, token),
      network.getAccountBalance(address, token),
      getVestingTotalForAddress(addr),
    ]);

    const account = {
      ...genesisData,
      totalUnlocked,
      totalUnlockedStacks: stacksValue(totalUnlocked),
      tokens,
      btcAddress: address,
      address: addr,
      history,
      status,
      balance,
      vesting_total: vestingTotal,
      vestingTotal,
      formattedUnlockTotal: accounting.formatNumber(vestingTotal * 10e-7),
      unlockTotalStacks: stacksValue(vestingTotal),
      unlockTotal: vestingTotal,
    };

    account.balance = balance.toString();
    account.status.debit_value = status.debit_value.toString();
    account.status.credit_value = status.credit_value.toString();

    return account;
  }

  static async getHistory(address) {
    let history = [];

    async function getAllHistoryPages(page) {
      return network.getAccountHistoryPage(address, page)
        .then((results) => {
          if (Object.keys(results).length === 0) {
            return history;
          }

          history = history.concat(results);
          return getAllHistoryPages(page + 1);
        }).catch((e) => {
          console.log('history error', e);
        });
    }

    history = await getAllHistoryPages(0);
    history.reverse();
    // const cumulativeBalance = 0;
    let lastDebitValue = 0;
    let lastCreditValue = 0;
    let totalUnlocked = 0;
    const blockHeights = history.map(h => h.block_id);
    const blockTimes = await getTimesForBlockHeights(blockHeights);
    history = await Promise.map(history, async (h, index) => {
      try {
        const debitValue = parseInt(h.debit_value, 10);
        const creditValue = parseInt(h.credit_value, 10);
        let historyEntry = {
          ...h,
        };
        if (h.debit_value > lastDebitValue) {
          historyEntry.value = debitValue - lastDebitValue;
          historyEntry.operation = 'SENT';
        } else {
          historyEntry.value = creditValue - lastCreditValue;
          historyEntry.operation = 'RECEIVED';
        }
        lastDebitValue = debitValue;
        lastCreditValue = creditValue;
        if (h.vtxindex === 0) {
          if (index === 0) {
            historyEntry.operation = 'GENESIS_INIT';
          } else {
            historyEntry.operation = 'UNLOCK';
            totalUnlocked += historyEntry.value;
          }
        }
        // try {
        //   const blockHash = await fetchBlockHash(h.block_id);
        //   const block = await fetchBlockInfo(blockHash);
        //   historyEntry.blockHash = blockHash;
        //   historyEntry.blockTime = block.time * 1000;
        // } catch (error) {
        //   console.error('Error when fetching block info:', error.message);
        // }
        historyEntry.blockTime = blockTimes[h.block_id] || blockToTime(h.block_id);
        const { txid } = h;
        try {
          const hex = await fetchRawTxInfo(txid);
          const decoded = decode(hex);
          historyEntry = {
            ...historyEntry,
            ...decoded,
          };
        } catch (error) {
          console.error('Error when fetching TX info', error.message);
        }

        return {
          ...historyEntry,
          credit_value: h.credit_value.toString(),
          debit_value: h.debit_value.toString(),
          creditValueStacks: stacksValue(h.credit_value.toString()),
          debitValueStacks: stacksValue(h.debit_value.toString()),
          valueStacks: stacksValue(historyEntry.value),
        };
      } catch (error) {
        console.error('Error when fetching history', error.message);
        return null;
      }
    });
    return [compact(history.reverse()), totalUnlocked];
  }

  static formatGenesisAddress(account) {
    const btcAddress = c32check.c32ToB58(account.address);
    return {
      balance: '0',
      status: {
        debit_value: '0',
        credit_value: '0',
      },
      btcAddress,
      transferUnlockDateFormatted: moment(account.transferUnlockDate).format('MMMM DD, YYYY'),
      formattedUnlockTotal: accounting.formatNumber(account.vesting_total * 10e-7),
      unlockTotal: account.vesting_total,
      unlockTotalStacks: stacksValue(account.vesting_total),
      history: [],
      ...account,
    };
  }

  static expiry() {
    return 60; // 1 minute
  }
}

module.exports = StacksAddress;
export default StacksAddress;

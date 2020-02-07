import * as BluebirdPromise from 'bluebird';
import * as c32check from 'c32check';
import * as moment from 'moment';
import { compact } from 'lodash';

import { Aggregator, AggregatorSetterResult } from './aggregator';
import {
  network,
} from '../client/core-api';
import { stacksValue, blockToTime } from '../utils';
import { getTimesForBlockHeights } from '../bitcore-db/queries';
import {
  getAddressSTXTransactions,
  getVestingForAddress,
  getAccountVesting,
  getTokensGrantedInHardFork,
  Vesting,
  StacksHistoryRecordData
} from '../core-db-pg/queries';

import { getAccounts, GenesisAccountInfoWithVesting } from '../addresses';
import BN = require('bn.js');

export type HistoryRecordWithData = StacksHistoryRecordData & {
  operation?: string;
  blockUnixTime?: number;
  blockTime?: string;
  valueStacks: string;
  value: number;
  sender?: string;
  recipient?: string;
}

export type StacksAddressResult = {
  cumulativeVestedAtBlocks: Record<number, number>;
  totalUnlocked: number;
  totalUnlockedStacks: string;
  tokens: string[];
  btcAddress: string;
  address: string;
  history: HistoryRecordWithData[];
  balance: string;
  status: {
    address: string;
    block_id: number;
    credit_value: string;
    debit_value: string;
    lock_transfer_block_id: number;
    txid: string;
    type: string;
    vtxindex: number;
  };
  vesting_total: number;
  totalReceived: number;
  vestingTotal: number;
  totalLocked: number;
  totalLockedStacks: string;
  tokensGranted: number;
};

type StacksAddressOpts = {
  addr: string;
  page: number;
};

export type GetHistoryResult = {
  records: HistoryRecordWithData[];
  totalUnlocked: number;
};

export type StackAccountStatusResult = {
  address: string;
  block_id: number;
  credit_value: BN;
  debit_value: BN;
  lock_transfer_block_id: number;
  txid: string;
  type: string;
  vtxindex: number;
};

class StacksAddress extends Aggregator<StacksAddressResult, StacksAddressOpts> {
  key({addr, page}: StacksAddressOpts) {
    return `StacksAddress:${addr}:${page || 0}`;
  }

  async setter({addr, page}: StacksAddressOpts): Promise<AggregatorSetterResult<StacksAddressResult>> {
    const { accountsByAddress } = await getAccounts();
    let genesisData = {};
    if (accountsByAddress[addr]) {
      genesisData = this.formatGenesisAddress(accountsByAddress[addr]);
    }

    const address = c32check.c32ToB58(addr);
    const token = 'STACKS';

    const [
      accountTokens,
      history,
      status,
      balance,
      Vesting,
      cumulativeVestedAtBlocks,
      tokensGranted
    ] = await Promise.all<
    {tokens: string[]}, GetHistoryResult, 
    StackAccountStatusResult, BN, Vesting, 
    Record<number, number>, number>([
      network.getAccountTokens(address),
      this.getHistory(address, page),
      network.getAccountStatus(address, token),
      network.getAccountBalance(address, token),
      getVestingForAddress(address),
      this.getCumulativeVestedAtBlocks(address),
      getTokensGrantedInHardFork(address)
    ]);

    let unlockInfo = {};
    if (Vesting.vestingTotal && Vesting.vestingTotal > 0) {
      unlockInfo = {
        formattedUnlockTotal: stacksValue(Vesting.vestingTotal, true),
        unlockTotalStacks: stacksValue(Vesting.vestingTotal),
        unlockTotal: Vesting.vestingTotal
      };
    }

    const account: StacksAddressResult = {
      ...genesisData,
      cumulativeVestedAtBlocks,
      totalUnlocked: Vesting.totalUnlocked,
      totalUnlockedStacks: stacksValue(Vesting.totalUnlocked),
      tokens: accountTokens.tokens,
      btcAddress: address,
      address: addr,
      history: history.records,
      status: {
        ...status,
        debit_value: status.debit_value.toString(),
        credit_value: status.credit_value.toString()
      },
      balance: balance.toString(),
      vesting_total: Vesting.vestingTotal, // preserved for wallet
      vestingTotal: Vesting.vestingTotal,
      totalLocked: Vesting.totalLocked,
      totalLockedStacks: stacksValue(Vesting.totalLocked),
      tokensGranted,
      totalReceived: parseInt(status.credit_value.toString(), 10) - Vesting.totalUnlocked - (tokensGranted || 0),
      ...unlockInfo,
    };

    return {
      shouldCacheValue: true,
      value: account,
    };
  }

  async getHistory(address: string, page: number): Promise<GetHistoryResult> {
    const history = await getAddressSTXTransactions(address, page);
    history.reverse();
    const totalUnlocked = 0;
    const blockHeights = history.map(h => h.block_id);
    const blockTimes = await getTimesForBlockHeights(blockHeights);
    const historyWithData = history.map((h) => {
      const blockUnixTime = blockTimes[h.block_id];
      const blockTime = new Date(blockUnixTime * 1000).toISOString();
      try {
        let operation: string;
        if (h.historyData.address === address) {
          operation = 'SENT';
        } else if (h.historyData.recipient_address === address) {
          operation = 'RECEIVED';
        } else {
          console.error(`Unexpected stx tx data, not a send or receive: ${JSON.stringify(h)}`)
          operation = 'UNKNOWN'
        }
        const historyEntry: HistoryRecordWithData = {
          ...h,
          sender: c32check.b58ToC32(h.historyData.address),
          recipient: c32check.b58ToC32(h.historyData.recipient_address),
          valueStacks: stacksValue(h.historyData.token_fee),
          value: parseInt(h.historyData.token_fee, 10),
          blockUnixTime: blockUnixTime,
          blockTime,
          operation
        };
        return historyEntry;
      } catch (error) {
        console.error(`Error when decoding TX info: ${error.message}`);
        console.error(error);
        return {
          ...h,
          blockTime
        } as HistoryRecordWithData;
      }
    });
    return {
      records: compact(historyWithData.reverse()),
      totalUnlocked
    };
  }

  // TODO: define return type
  formatGenesisAddress(account: GenesisAccountInfoWithVesting) {
    const btcAddress = c32check.c32ToB58(account.address);
    return {
      balance: '0',
      status: {
        debit_value: '0',
        credit_value: '0'
      },
      btcAddress,
      transferUnlockDateFormatted: moment(account.transferUnlockDate).format(
        'MMMM DD, YYYY'
      ),
      formattedUnlockTotal: stacksValue(account.vesting_total, true),
      unlockTotal: account.vesting_total,
      unlockTotalStacks: stacksValue(account.vesting_total),
      history: [] as any[],
      ...account
    };
  }

  async getCumulativeVestedAtBlocks(address: string) {
    const vesting = await getAccountVesting(address);
    const cumulativeVestedAtBlocks: Record<number, number> = {};
    let cumulativeVested = 0;
    if (vesting.length === 0) {
      return null;
    }
    vesting.forEach((block) => {
      const date = blockToTime(block.block_id);
      cumulativeVested += parseInt(block.vesting_value, 10);
      cumulativeVestedAtBlocks[date] = cumulativeVested;
    });
    return cumulativeVestedAtBlocks;
  }

  expiry() {
    return 60; // 1 minute
  }
}

const stacksAddressAggregator = new StacksAddress();
export { stacksAddressAggregator };

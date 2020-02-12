import * as fs from 'fs-extra';
import * as _ from 'lodash';
import { blockToTime } from './utils';
import { StacksTransaction, HistoryRecordResult } from './core-db-pg/queries';
import { HistoryDataTokenTransfer } from './core-db-pg/history-data-types';
import { getSTXAddress } from './stacks-decoder';


export type GenesisAccountInfo = {
  address: string;
  lock_send: number;
  metadata: string;
  receive_whitelisted: boolean;
  type: string;
  value: number;
  vesting: Record<string, number>;
  vesting_total: number;
}

export type GenesisAccountInfoWithVesting = GenesisAccountInfo & {
  transferUnlockDate: number;
  cumulativeVestedAtBlocks: Record<number, number>;
};

export type GetGenesisAccountsResult = { 
  accountsByAddress: Record<string, GenesisAccountInfoWithVesting>;
  accounts: GenesisAccountInfo[];
}

export async function getAccounts(): Promise<GetGenesisAccountsResult> {
  const accounts: GenesisAccountInfo[] = await fs.readJson('./data/genesis.json');

  const addresses: Record<string, GenesisAccountInfoWithVesting> = {};
  accounts.forEach(account => {
    const { address } = account;
    if (address.length !== -1 && address.indexOf('SP00') !== 0) {
      const cumulativeVestedAtBlocks: Record<number, number> = {};
      let cumulativeVested = 0;
      Object.keys(account.vesting).forEach(block => {
        const date = blockToTime(parseInt(block, 10));
        cumulativeVested += account.vesting[block];
        cumulativeVestedAtBlocks[date] = cumulativeVested;
      });
      addresses[address] = {
        ...account,
        transferUnlockDate: blockToTime(account.lock_send),
        cumulativeVestedAtBlocks
      };
    }
  });

  return {
    accountsByAddress: addresses,
    accounts
  };
};

export const getTotals = ({ accounts }: { accounts: GenesisAccountInfo[] }) => {
  const totals = {
    initalValue: 0,
    vestedValues: 0,
    vestedAtBlocks: {} as Record<number, number>,
    transferrableAtBlocks: {} as Record<number, number>,
    addressCount: accounts.length,
    cumulativeVestedAtBlocks: {} as Record<string, number>,
  };

  let cumulativeVested = 0;

  accounts.forEach(account => {
    totals.initalValue += account.value;
    totals.vestedValues += account.vesting_total;
    const vestingKeys = Object.keys(account.vesting);
    vestingKeys.forEach((block, i) => {
      const date = blockToTime(parseInt(block, 0));
      totals.vestedAtBlocks[date] = totals.vestedAtBlocks[date] || 0;
      totals.transferrableAtBlocks[date] =
        totals.transferrableAtBlocks[date] || 0;
      totals.vestedAtBlocks[date] += account.vesting[block];
      if (parseInt(block, 10) >= account.lock_send) {
        const previousBlock = parseInt(vestingKeys[i - 1], 10);
        if (i !== 0 && previousBlock < account.lock_send) {
          // console.log('first vesting block with transfer', i + 1, _.range(i + 1));
          // accumulate all previous blocks
          // console.log(_.range(0, i));
          const sum = (_sum: number, blk: number) => _sum + account.vesting[vestingKeys[blk]];
          totals.transferrableAtBlocks[date] = _.range(i + 1).reduce(sum, 0);
          // console.log(_.range(i + 1).reduce(sum, 0));
        } else {
          // console.log('normal vesting', block);
          totals.transferrableAtBlocks[date] += account.vesting[block];
        }
      }
    });
    const lastGrantBlock = _.last(vestingKeys);
    if (parseInt(lastGrantBlock, 10) < account.lock_send) {
      console.log(
        'last grant before lock_send',
        account.address,
        account.lock_send,
        lastGrantBlock
      );
      const date = blockToTime(account.lock_send);
      totals.transferrableAtBlocks[date] =
        totals.transferrableAtBlocks[date] || 0;
      totals.transferrableAtBlocks[date] += account.vesting_total;
    }
  });

  const blocks = Object.keys(totals.vestedAtBlocks)
    .map(b => parseInt(b, 10))
    .sort((a, b) => a - b);

  blocks.forEach(block => {
    const amount = totals.vestedAtBlocks[block];
    cumulativeVested += amount;
    totals.cumulativeVestedAtBlocks[block] = cumulativeVested;
  });

  return totals;
};


export type GetStxAddressResult = {
  senderSTX?: string;
  recipientSTX?: string;
}

export const getStxAddresses = (
  tx: StacksTransaction | HistoryRecordResult
): GetStxAddressResult => {
  if (!tx.historyData) {
    return {};
  }
  if (tx.opcode === 'TOKEN_TRANSFER') {
    const historyData = tx.historyData as HistoryDataTokenTransfer;
    return {
      senderSTX: getSTXAddress(historyData.sender),
      recipientSTX: getSTXAddress(historyData.recipient)
    };
  }
  return {};
};

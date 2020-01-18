import { Request, Response, Router } from 'express';
import * as moment from 'moment';
import * as request from 'request-promise';
import * as Sentry from '@sentry/node';

import BlockAggregator from '../lib/aggregators/block-v2';
import BlocksAggregator from '../lib/aggregators/blocks-v2';
import TotalSupplyAggregator, { TotalSupplyResult } from '../lib/aggregators/total-supply';
import FeeEstimator from '../lib/aggregators/fee-estimate';
import { getTimesForBlockHeights, lookupBlockOrTxHash, getBlockHash } from '../lib/bitcore-db/queries';
import {
  getRecentStacksTransfers,
  getRecentNames,
  getRecentSubdomains,
  StacksTransaction,
  getAllHistoryRecords,
  HistoryRecordResult
} from '../lib/core-db-pg/queries';

import { blockToTime, stacksValue } from '../lib/utils';
import TopBalancesAggregator from '../lib/aggregators/top-balances';
import { HistoryDataTokenTransfer } from '../lib/core-db-pg/history-data-types';
import { getSTXAddress } from '../lib/stacks-decoder';
import { StatusCodeError } from 'request-promise/errors';

const baseRouter = Router();

const getAsync = (
  path: string | RegExp, 
  handler: (req: Request, res?: Response) => Promise<void> | void
) => {
  baseRouter.get(path, async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error(error);
      Sentry.captureException(error);
      res.status(500).json({ success: false });
    }
  })
};

const Controller = Object.assign(baseRouter, { getAsync });

Controller.getAsync('/blocks/:hash', async (req, res) => {
  const { hash } = req.params;
  const block = await BlockAggregator.setter(hash);
  res.json({ block });
});

Controller.getAsync('/blocks', async (req, res) => {
  let { date } = req.query;
  if (!date) {
    date = moment()
      .utc()
      .format('YYYY-MM-DD');
  }
  console.log(date);
  const { page } = req.query;
  const blocks = await BlocksAggregator.setter({
    date,
    page: page ? parseInt(page, 10) : 0
  });
  res.json({ blocks });
});

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

Controller.getAsync('/transactions/stx', async (req, res) => {
  const page = req.query.page || '0';
  const transactions = await getRecentStacksTransfers(
    100,
    parseInt(page, 10)
  );
  const blockTimes = await getTimesForBlockHeights(
    transactions.map(tx => tx.blockHeight)
  );
  const transfers = transactions.map(tx => ({
    ...tx,
    timestamp: blockTimes[tx.blockHeight],
    ...getStxAddresses(tx)
  }));
  res.json({ transfers });
});

Controller.getAsync('/transactions/names', async (req, res) => {
  const limit = 100;
  const page = req.query.page || '0';
  const namesResult = await getRecentNames(limit, parseInt(page, 10));
  const blockTimes = await getTimesForBlockHeights(
    namesResult.map(name => name.block_number)
  );
  const names = namesResult.map(name => ({
    ...name,
    timestamp: blockTimes[name.block_number]
  }));
  res.json({ names });
});

Controller.getAsync(
  '/transactions/subdomains',
  async (req, res) => {
    const limit = 100;
    const page = req.query.page || '0';
    const subdomainsResult = await getRecentSubdomains(
      limit,
      parseInt(page, 10)
    );
    const blockTimes = await getTimesForBlockHeights(
      subdomainsResult.map(sub => sub.blockHeight)
    );
    const subdomains = subdomainsResult.map(name => ({
      ...name,
      timestamp: blockTimes[name.blockHeight]
    }));
    res.json({ subdomains });
  }
);

Controller.getAsync('/transactions/all', async (req, res) => {
  const limit = 100;
  const page = req.query.page || '0';
  const historyResult = await getAllHistoryRecords(limit, parseInt(page, 10));
  const heights = historyResult.map(item => item.block_id);
  const blockTimes = await getTimesForBlockHeights(heights);
  const history = historyResult.map(historyRecord => ({
    ...historyRecord,
    timestamp: blockTimes[historyRecord.block_id],
    ...getStxAddresses(historyRecord)
  }));
  res.json({ history });
});


export type Genesis2019 = {
  accounts: Genesis2019Account[];
  total: number;
};

export type Genesis2019Account = {
  address: string;
  lock_send: number;
  metadata: string;
  receive_whitelisted: boolean;
  type: string;
  value: number;
  vesting: { [blockHeight: string]: number };
  vesting_total: number;
  unlockUntil?: string;
  totalFormatted?: string;
  unlockPerMonthFormatted?: string;
};

export type Genesis2019AddressInfo = {
  accounts: Genesis2019Account[];
  total: number;
  totalFormatted: string;
};

export const getGenesis2019AddressInfo = async (stacksAddress: string): Promise<Genesis2019AddressInfo | null> => {
  const uri = `${process.env.HF_URL}/${stacksAddress}`;
  let genesis2019: Genesis2019;
  try {
    genesis2019 = await request.get({
      uri,
      json: true
    });
  } catch (error) {
    if ((error as StatusCodeError).statusCode === 404) {
      return null;
    }
    throw error;
  }
  const { accounts: _accounts, total } = genesis2019;
  const accounts = _accounts.map((_account) => {
    const account = { ..._account };
    const vestingBlocks = Object.keys(account.vesting);
    const lastVestingMonth = blockToTime(
      parseInt(vestingBlocks[(vestingBlocks.length - 1)], 10)
    );
    // TODO: this should be an absolute timestamp, and formatted for display on the front-end.
    account.unlockUntil = moment(lastVestingMonth).format('MMMM Do, YYYY');
    account.totalFormatted = stacksValue(account.value + account.vesting_total, true);
    account.unlockPerMonthFormatted = stacksValue(account.vesting[vestingBlocks[0]], true);
    return account;
  });
  const totalFormatted = stacksValue(total, true);
  return {
    accounts,
    total,
    totalFormatted
  };
};

Controller.getAsync(
  '/genesis-2019/:stacksAddress',
  async (req, res) => {
    const { stacksAddress } = req.params;
    const info = await getGenesis2019AddressInfo(stacksAddress);
    if (!info) {
      res.status(404).json({ success: false });
    } else {
      res.json(info);
    }
  }
);

Controller.getAsync('/search/hash/:hash', async (req, res) => {
  const hashString: string = req.params.hash;
  const hashLookup = await lookupBlockOrTxHash(hashString);
  const result: { found?: boolean; hash?: string; type?: string } = {
    hash: hashString,
  };
  if (!hashLookup) {
    result.found = false;
    res.status(404).json(result);
    return
  }
  result.found = true;
  if (hashLookup === 'block') {
    result.type = 'btc_block';
  } else if (hashLookup === 'tx') {
    result.type = 'btc_tx';
  } else {
    throw new Error(`Unexpected lookupBlockOrTxHash result: ${JSON.stringify(hashLookup)}`);
  }
  res.json(result);
});

Controller.getAsync('/search/hash-from-height/:height', async (req, res) => {
  const heightString: string = req.params.height;
  const hashLookup = await getBlockHash(heightString);
  if (hashLookup) {
    res.json({found: true, hash: hashLookup, height: heightString});
  } else {
    res.status(404).json({ success: false });
  }
});

Controller.getAsync('/fee-estimate', async (req, res) => {
  const fee = await FeeEstimator.fetch();
  res.json({ recommended: fee });
});

Controller.getAsync('/total-supply', async (req, res) => {
  const totalSupplyInfo: TotalSupplyResult = await TotalSupplyAggregator.fetch();
  const formatted = JSON.stringify(totalSupplyInfo, null, 2);
  res.contentType('application/json').send(formatted);
});

Controller.getAsync('/unlocked-supply', async (req, res) => {
  const totalSupplyInfo: TotalSupplyResult = await TotalSupplyAggregator.fetch();
  res.contentType('text/plain; charset=UTF-8').send(totalSupplyInfo.unlockedSupply);
});

Controller.getAsync('/top-balances', async (req, res) => {
  let count = 250;
  if (req.query.count) {
    const queryCount = parseInt(req.query.count, 10);
    if (queryCount > 0) {
      count = queryCount;
    }
  }
  const MAX_COUNT = 500;
  if (count > MAX_COUNT) {
    throw new Error(`Max count of ${MAX_COUNT} exceeded`);
  }
  const topBalances = await TopBalancesAggregator.fetch({ count });
  res.contentType('application/json');
  res.send(JSON.stringify(topBalances, null, 2));
});

export default Controller;

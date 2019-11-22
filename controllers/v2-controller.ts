import express, { Request, Response } from 'express';
import * as c32check from 'c32check';
import { address, networks } from 'bitcoinjs-lib';
import moment from 'moment';
import request from 'request-promise';
import accounting from 'accounting';
import BluebirdPromise from 'bluebird';
import BigNumber from 'bignumber.js';
import * as Sentry from '@sentry/node';

import BlockAggregator from '../lib/aggregators/block-v2';
import BlocksAggregator from '../lib/aggregators/blocks-v2';
import TotalSupplyAggregator, { TotalSupplyResult } from '../lib/aggregators/total-supply';
import FeeEstimator from '../lib/aggregators/fee-estimate';
import { getTimesForBlockHeights } from '../lib/bitcore-db/queries';
import {
  getRecentStacksTransfers,
  getRecentNames,
  getRecentSubdomains,
  StacksTransaction,
  getAllHistoryRecords,
  HistoryRecordWithSubdomains
} from '../lib/core-db-pg/queries';

import { blockToTime, stacksValue, formatNumber } from '../lib/utils';
import TopBalancesAggregator from '../lib/aggregators/top-balances';

const Controller = express.Router();

Controller.get('/blocks/:hash', async (req: Request, res: Response) => {
  try {
    const { hash } = req.params;
    const block = await BlockAggregator.setter(hash);
    res.json({ block });
  } catch (error) {
    console.error(error);
    Sentry.captureException(error);
    res.status(500).json({ success: false });
  }
});

Controller.get('/blocks', async (req: Request, res: Response) => {
  try {
    let { date } = req.query;
    if (!date) {
      date = moment()
        .utc()
        .format('YYYY-MM-DD');
    }
    console.log(date);
    const { page } = req.query;
    const blocks = await BlocksAggregator.setter(
      date,
      page ? parseInt(page, 10) : 0
    );
    res.json({ blocks });
  } catch (error) {
    console.error(error);
    Sentry.captureException(error);
    res.status(500).json({ success: false });
  }
});

const getSTXAddress = (addr: string) =>
  c32check.b58ToC32(
    address.fromOutputScript(Buffer.from(addr, 'hex'), networks.bitcoin)
  );

export const getStxAddresses = (
  tx: StacksTransaction | HistoryRecordWithSubdomains
) => {
  if (!tx.historyData) {
    return {};
  }
  if (tx.opcode === 'TOKEN_TRANSFER') {
    return {
      senderSTX: getSTXAddress(tx.historyData.sender),
      recipientSTX: getSTXAddress(tx.historyData.recipient)
    };
  }
  return {};
};

Controller.get('/transactions/stx', async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    console.error(error);
    Sentry.captureException(error);
    res.status(500).json({ success: false });
  }
});

Controller.get('/transactions/names', async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    console.error(error);
    Sentry.captureException(error);
    res.status(500).json({ success: false });
  }
});

Controller.get(
  '/transactions/subdomains',
  async (req: Request, res: Response) => {
    try {
      const limit = 100;
      const page = req.query.page || '0';
      const subdomainsResult = await getRecentSubdomains(
        limit,
        parseInt(page, 10)
      );
      const blockTimes = await getTimesForBlockHeights(
        subdomainsResult.map(sub => parseInt(sub.blockHeight as string, 10))
      );
      const subdomains = subdomainsResult.map(name => ({
        ...name,
        timestamp: blockTimes[parseInt(name.blockHeight as string, 10)]
      }));
      res.json({ subdomains });
    } catch (error) {
      console.error(error);
      Sentry.captureException(error);
      res.status(500).json({ success: false });
    }
  }
);

Controller.get('/transactions/all', async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    console.error(error);
    Sentry.captureException(error);
    res.status(500).json({ success: false });
  }
});

Controller.get(
  '/genesis-2019/:stacksAddress',
  async (req: Request, res: Response) => {
    const { stacksAddress } = req.params;
    const uri = `${process.env.HF_URL}/${stacksAddress}`;
    try {
      const { accounts: _accounts, total } = await request.get({
        uri,
        json: true
      });
      const accounts = _accounts.map(_account => {
        const account = { ..._account };
        const vestingBlocks = Object.keys(account.vesting);
        const lastVestingMonth = blockToTime(
          vestingBlocks[String(vestingBlocks.length - 1)]
        );
        account.unlockUntil = moment(lastVestingMonth).format('MMMM Do, YYYY');
        account.totalFormatted = formatNumber(
          stacksValue(account.value + account.vesting_total)
        );
        account.unlockPerMonthFormatted = formatNumber(
          stacksValue(account.vesting[vestingBlocks[0]])
        );
        return account;
      });
      const totalFormatted = formatNumber(stacksValue(total));
      res.json({ accounts, total, totalFormatted });
    } catch (error) {
      console.error(error);
      Sentry.captureException(error);
      res.status(404).json({ success: false });
    }
  }
);

Controller.get('/fee-estimate', async (req: Request, res: Response) => {
  try {
    const fee = await FeeEstimator.fetch();
    res.json({ recommended: fee });
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ success: false });
  }
});

Controller.get('/total-supply', async (req: Request, res: Response) => {
  try {
    const totalSupplyInfo: TotalSupplyResult = await TotalSupplyAggregator.fetch();
    const formatted = JSON.stringify(totalSupplyInfo, null, 2);
    res.contentType('application/json').send(formatted);
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ success: false });
  }
});

Controller.get('/unlocked-supply', async (req: Request, res: Response) => {
  try {
    const totalSupplyInfo: TotalSupplyResult = await TotalSupplyAggregator.fetch();
    res.contentType('text/plain; charset=UTF-8').send(totalSupplyInfo.unlockedSupply);
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ success: false });
  }
});

Controller.get('/top-balances', async (req: Request, res: Response) => {
  try {
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
    const topBalances = await TopBalancesAggregator.fetch(count);
    res.contentType('application/json');
    res.send(JSON.stringify(topBalances, null, 2));
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ success: false });
  }
});

export default Controller;

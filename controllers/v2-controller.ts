import { Request, Response, Router } from 'express';
import * as moment from 'moment';
import * as request from 'request-promise-native';
import { StatusCodeError } from 'request-promise-native/errors';

import { blockAggregator } from '../lib/aggregators/block-v2';
import { blocksAggregator } from '../lib/aggregators/blocks-v2';
import { transactionsAggregator } from '../lib/aggregators/transactions';
import { subdomainsAggregator } from '../lib/aggregators/subdomains';
import { namesAggregator } from '../lib/aggregators/names';
import { stxTransactionsAggregator } from '../lib/aggregators/stx-transactions';
import { TotalSupplyResult, totalSupplyAggregator } from '../lib/aggregators/total-supply';
import { topBalancesAggregator } from '../lib/aggregators/top-balances';
import { feeEstimatorAggregator } from '../lib/aggregators/fee-estimate';

import { lookupBlockOrTxHash, getBlockHash } from '../lib/bitcore-db/queries';
import { blockToTime, stacksValue, logError } from '../lib/utils';
import * as searchUtil from '../lib/search-util';

const baseRouter = Router();

const getAsync = (
  path: string | RegExp, 
  handler: (req: Request, res?: Response) => Promise<void> | void
) => {
  baseRouter.get(path, async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  })
};

const Controller = Object.assign(baseRouter, { getAsync });

Controller.getAsync('/blocks/:hash', async (req, res) => {
  const { hash } = req.params;
  const block = await blockAggregator.fetch(hash);
  res.json({ block });
});

Controller.getAsync('/blocks', async (req, res) => {
  let { date } = req.query;
  if (!date) {
    date = moment()
      .utc()
      .format('YYYY-MM-DD');
  }
  const page = parseInt(req.query.page, 10) || 0;
  const blocks = await blocksAggregator.fetch({
    date,
    page
  });
  res.json(blocks);
});



Controller.getAsync('/transactions/stx', async (req, res) => {
  const page = parseInt(req.query.page, 10) || 0;
  const transfers = await stxTransactionsAggregator.fetch({page});
  res.json({ transfers });
});

Controller.getAsync('/transactions/names', async (req, res) => {
  const page = parseInt(req.query.page, 10) || 0;
  const names = await namesAggregator.fetch({page});
  res.json({ names });
});

Controller.getAsync('/transactions/subdomains', async (req, res) => {
  const page = parseInt(req.query.page, 10) || 0;
  const subdomains = await subdomainsAggregator.fetch({page});
  res.json({ subdomains });
});

Controller.getAsync('/transactions/all', async (req, res) => {
  const page = parseInt(req.query.page, 10) || 0;
  const history = await transactionsAggregator.fetch({page});
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

Controller.getAsync('/search/:term', async (req, res) => {
  const query: string = req.params.term && req.params.term.trim();
  // Fast test if query can only be a possible user ID.
  const blockstackID = searchUtil.isValidBlockstackName(query);
  if (blockstackID) {
    res.json({ found: true, type: 'name', name: blockstackID });
    return;
  }

  // Fast test if query can only be a STX address.
  const stxAddress = searchUtil.isValidStxAddress(query);
  if (stxAddress) {
    res.json({ found: true, type: 'stacks-address', address: stxAddress });
    return;
  }

  // Fast test if the query can be a value hex hash string.
  const hash = searchUtil.isValidSha256Hash(query);
  if (hash) {
    // Determine what the hash corresponds to -- currently, search allows looking
    // up a btc block, btc tx, or Stacks tx by hash.
    const hashLookup = await lookupBlockOrTxHash(hash);
    if (!hashLookup) {
      res.status(404).json({ found: false, isHash: true });
      return
    }
    if (hashLookup === 'block') {
      res.json({ found: true, type: 'btc-block', hash: hash });
      return;
    } else if (hashLookup === 'tx') {
      res.json({ found: true, type: 'btc-tx', hash: hash });
      return;
    } else {
      throw new Error(`Unexpected lookupBlockOrTxHash result: ${JSON.stringify(hashLookup)}`);
    }
  }

  // TODO: [stacks-v2] support for searching Stacks blocks by height
  const blockHeight = searchUtil.isValidBtcBlockHeight(query);
  if (blockHeight) {
    const hashLookup = await getBlockHash(blockHeight);
    if (!hashLookup) {
      res.status(404).json({ found: false });
      return
    }
    res.json({ found: true, type: 'btc-block', hash: hashLookup });
    return
  }

  // Fast test if query can only be a BTC address.
  const btcAddress = searchUtil.isValidBtcAddress(query);
  if (btcAddress) {
    res.json({ found: true, type: 'btc-address', address: btcAddress });
    return;
  }

  res.status(404).json({ found: false });
});

Controller.getAsync('/fee-estimate', async (req, res) => {
  const fee = await feeEstimatorAggregator.fetch();
  res.json({ recommended: fee });
});

Controller.getAsync('/total-supply', async (req, res) => {
  const totalSupplyInfo: TotalSupplyResult = await totalSupplyAggregator.fetch();
  const formatted = JSON.stringify(totalSupplyInfo, null, 2);
  res.contentType('application/json').send(formatted);
});

Controller.getAsync('/unlocked-supply', async (req, res) => {
  const totalSupplyInfo: TotalSupplyResult = await totalSupplyAggregator.fetch();
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
  const topBalances = await topBalancesAggregator.fetch({ count });
  res.contentType('application/json');
  res.send(JSON.stringify(topBalances, null, 2));
});

export default Controller;

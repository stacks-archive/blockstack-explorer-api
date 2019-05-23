import express, { Request, Response } from 'express';
import moment from 'moment';

import BlockAggregator from '../lib/aggregators/block-v2';
import BlocksAggregator from '../lib/aggregators/blocks-v2';
// import { getBlocks } from '../lib/bitcore-db/queries';
import { getRecentStacksTransfers, getRecentNames, getRecentSubdomains } from '../lib/core-db/queries';
import { blockToTime } from '../lib/utils';

const Controller = express.Router();

Controller.get('/blocks/:hash', async (req: Request, res: Response) => {
  try {
    const { hash } = req.params;
    const block = await BlockAggregator.fetch(hash);
    res.json({ block });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});

Controller.get('/blocks', async (req: Request, res: Response) => {
  try {
    let { date } = req.query;
    if (!date) {
      date = moment().utc().format('YYYY-MM-DD');
    }
    console.log(date);
    const { page } = req.query;
    // const blocks = await getBlocks(date, parseInt(page, 10));
    const blocks = await BlocksAggregator.setter(date, page ? parseInt(page, 10) : 0);
    res.json({ blocks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});

Controller.get('/transactions/stx', async (req: Request, res: Response) => {
  try {
    const page = req.query.page || '0';
    const transactions = await getRecentStacksTransfers(10, parseInt(page, 10));
    const transfers = transactions.map(tx => ({
      ...tx,
      timestamp: blockToTime(tx.blockHeight),
    }));
    res.json({ transfers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});

Controller.get('/transactions/names', async (req: Request, res: Response) => {
  try {
    const limit = 100;
    const page = req.query.page || '0';
    const namesResult = await getRecentNames(limit, parseInt(page, 10));
    const names = namesResult.map(name => ({
      ...name,
      timestamp: blockToTime(name.block_number),
    }));
    res.json({ names });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});

Controller.get('/transactions/subdomains', async (req: Request, res: Response) => {
  try {
    const limit = 100;
    const page = req.query.page || '0';
    const subdomainsResult = await getRecentSubdomains(limit, parseInt(page, 10));
    const subdomains = subdomainsResult.map(name => ({
      ...name,
      timestamp: blockToTime(name.blockHeight),
    }));
    res.json({ subdomains });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});

export default Controller;

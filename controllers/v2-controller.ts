import express, { Request, Response } from 'express';
import moment from 'moment';

import BlockAggregator from '../lib/aggregators/block-v2';
import BlocksAggregator from '../lib/aggregators/blocks-v2';
import { getBlocks } from '../lib/bitcore-db/queries';

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

export default Controller;

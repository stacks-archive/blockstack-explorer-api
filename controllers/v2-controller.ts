import express, { Request, Response } from 'express';

import BlockAggregator from '../lib/aggregators/block-v2';

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

export default Controller;

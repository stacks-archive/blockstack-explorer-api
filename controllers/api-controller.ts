import { Request, Response, Router } from 'express';
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import { decorateApp } from '@awaitjs/express';
import * as Sentry from '@sentry/node';

import { getTotals, GetGenesisAccountsResult } from '../lib/addresses';
import {
  fetchTX,
  fetchAddress,
  fetchNames,
  fetchNamespaceNames,
  fetchBlockHash
} from '../lib/client/core-api';

import NameOpsAggregator from '../lib/aggregators/name-ops';
import BlocksAggregator from '../lib/aggregators/blocks';
import NamespaceAggregator from '../lib/aggregators/namespaces';
import BlockAggregator from '../lib/aggregators/block';
import TotalNamesAggregator from '../lib/aggregators/total-names';
import StacksAddressAggregator from '../lib/aggregators/stacks-address';
import HomeInfoAggregator from '../lib/aggregators/home-info';
import NameAggregator from '../lib/aggregators/name';
import BTCAddressAggregator from '../lib/aggregators/btc-address';

// const resJSON = (dataFn) => {}
const respond = (dataFn: (req: Request, res: Response) => any) => async (req: Request, res: Response) => {
  try {
    const data = await dataFn(req, res);
    if (!data) {
      res.status(404);
    }
    res.json(data);
  } catch (error) {
    console.error(error);
    Sentry.captureException(error);
    res.status(404).json({ success: false });
  }
};

const makeAPIController = (Genesis: GetGenesisAccountsResult) => {
  const APIController = decorateApp(Router());
  const totals = getTotals(Genesis);

  APIController.getAsync('/accounts/global', (req: Request, res: Response) => res.json(totals));

  APIController.getAsync(
    '/accounts/:address',
    respond((req: Request) => Genesis.accountsByAddress[req.params.address])
  );

  APIController.getAsync(
    '/name-operations',
    respond(async () => {
      const nameOperations = await NameOpsAggregator.get({});
      return {
        nameOperations
      };
    })
  );

  APIController.getAsync(
    '/names/:name',
    respond(async (req: Request) => NameAggregator.fetch({name: req.params.name, historyPage: req.query.page}))
  );

  APIController.getAsync(
    '/transactions/:tx',
    respond((req: Request) => fetchTX(req.params.tx))
  );

  APIController.getAsync(
    '/addresses/:address',
    respond(async (req: Request) =>
      BTCAddressAggregator.fetch({address: req.params.address, txPage: req.query.page})
    )
  );

  APIController.getAsync(
    '/blocks',
    respond(async (req: Request) => BlocksAggregator.fetch(req.query.date))
  );

  APIController.getAsync(
    '/blocks/:hashOrHeight',
    respond(async (req: Request) => {
      const { hashOrHeight } = req.params;
      let hash = hashOrHeight;
      if (hashOrHeight.toString().length < 10) {
        hash = await fetchBlockHash(parseInt(hashOrHeight, 10));
      }
      return BlockAggregator.fetch(hash);
    })
  );

  APIController.getAsync(
    '/namespaces',
    respond(async () => NamespaceAggregator.fetch())
  );

  APIController.getAsync(
    '/names',
    respond(async (req: Request) => fetchNames(req.query.page || 0))
  );

  APIController.getAsync(
    '/namespaces/:namespace',
    respond(async (req: Request) =>
      fetchNamespaceNames(req.params.namespace, req.query.page || 0)
    )
  );

  APIController.getAsync(
    '/name-counts',
    respond(async () => TotalNamesAggregator.fetch())
  );

  APIController.getAsync(
    '/stacks/addresses/:address',
    respond(async (req: Request) => {
      let page = parseInt(req.params.page, 10);
      if (!page || !Number.isFinite(page) || page < 0) {
        page = 0;
      }
      const result = await StacksAddressAggregator.fetch({addr: req.params.address, page});
      return result
    })
  );

  APIController.getAsync(
    '/home',
    respond(async () => HomeInfoAggregator.fetch())
  );

  APIController.getAsync(
    '/search/:query',
    respond(async (req: Request) => {
      const { query } = req.params;
      const getOrFail = async (promise: Promise<any>) => {
        try {
          const result = await promise;
          return result;
        } catch (error) {
          return null;
        }
      };

      const blockSearch = async (hashOrHeight: string | number) => {
        let hash = hashOrHeight;
        if (hashOrHeight.toString().length < 10) {
          hash = await fetchBlockHash(hashOrHeight as number);
        }
        return BlockAggregator.fetch(hash as string);
      };

      const fetches = [
        getOrFail(fetchTX(query)),
        getOrFail(fetchAddress(query)),
        getOrFail(blockSearch(query))
      ];

      const [tx, btcAddress, block] = await Promise.all(fetches);

      if (tx) {
        return {
          pathname: '/transaction/single',
          as: `/tx/${query}`,
          id: query,
          data: JSON.stringify(tx)
        };
      }
      if (btcAddress) {
        return {
          pathname: '/address/single',
          as: `/address/${query}`,
          id: query,
          address: query,
          data: btcAddress
        };
      }
      if (block) {
        return {
          pathname: '/blocks/single',
          as: `/block/${block.hash}`,
          data: block,
          hash: query
        };
      }

      return {
        success: false
      };
    })
  );

  return APIController;
};

export default makeAPIController;

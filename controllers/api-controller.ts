import { Request, Response, Router, NextFunction, RequestHandler } from 'express';
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
import { Json } from '../lib/aggregators/aggregator';

const respond = (dataFn: (req: Request, res?: Response) => Promise<Json> | Json) => {
  return async (req: Request, res?: Response) => {
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
  }
};

const makeAPIController = (Genesis: GetGenesisAccountsResult) => {
  const APIController = Router();
  const totals = getTotals(Genesis);

  APIController.get('/accounts/global', respond(() => totals));

  APIController.get(
    '/accounts/:address',
    respond(req => Genesis.accountsByAddress[req.params.address])
  );

  APIController.get(
    '/name-operations',
    respond(async () => {
      const nameOperations = await NameOpsAggregator.get({});
      return {
        nameOperations
      };
    })
  );

  APIController.get(
    '/names/:name',
    respond(req => NameAggregator.fetch({name: req.params.name, historyPage: parseInt(req.query.page, 0)}))
  );

  APIController.get(
    '/transactions/:tx',
    respond(req => fetchTX(req.params.tx))
  );

  APIController.get(
    '/addresses/:address',
    respond(req =>
      BTCAddressAggregator.fetch({address: req.params.address, txPage: parseInt(req.query.page, 10)})
    )
  );

  APIController.get(
    '/blocks',
    respond(req => BlocksAggregator.fetch(req.query.date))
  );

  APIController.get(
    '/blocks/:hashOrHeight',
    respond(async (req) => {
      const { hashOrHeight } = req.params;
      let hash = hashOrHeight;
      if (hashOrHeight.toString().length < 10) {
        hash = await fetchBlockHash(parseInt(hashOrHeight, 10));
      }
      return BlockAggregator.fetch(hash);
    })
  );

  APIController.get(
    '/namespaces',
    respond(() => NamespaceAggregator.fetch())
  );

  APIController.get(
    '/names',
    // TODO: refactor to use pg query rather than core node API
    respond(req => fetchNames(req.query.page || 0))
  );

  APIController.get(
    '/namespaces/:namespace',
    respond(req =>
      // TODO: refactor to use pg query rather than core node API
      fetchNamespaceNames(req.params.namespace, req.query.page || 0)
    )
  );

  APIController.get(
    '/name-counts',
    respond(() => TotalNamesAggregator.fetch())
  );

  APIController.get(
    '/stacks/addresses/:address',
    respond(async (req) => {
      let page = parseInt(req.query.page, 10);
      if (!page || !Number.isFinite(page) || page < 0) {
        page = 0;
      }
      const result = await StacksAddressAggregator.fetch({addr: req.params.address, page});
      return result
    })
  );

  APIController.get(
    '/home',
    respond(() => HomeInfoAggregator.fetch())
  );

  APIController.get(
    '/search/:query',
    respond(async (req) => {
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

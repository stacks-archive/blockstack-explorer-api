import { Request, Response, Router, NextFunction, RequestHandler } from 'express';
import * as Sentry from '@sentry/node';

import { getTotals, GetGenesisAccountsResult } from '../lib/addresses';
import {
  fetchAddress,
  fetchNames,
  fetchNamespaceNames,
} from '../lib/client/core-api';

import NamespaceAggregator from '../lib/aggregators/namespaces';
import BlockAggregator from '../lib/aggregators/block-v2';
import TotalNamesAggregator from '../lib/aggregators/total-names';
import StacksAddressAggregator from '../lib/aggregators/stacks-address';
import HomeInfoAggregator from '../lib/aggregators/home-info';
import NameAggregator from '../lib/aggregators/name';
import BTCAddressAggregator from '../lib/aggregators/btc-address';
import TransactionAggregator from '../lib/aggregators/transaction';
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
    '/names/:name',
    respond(req => NameAggregator.fetch({name: req.params.name, historyPage: parseInt(req.query.page, 0)}))
  );

  APIController.get(
    '/transactions/:tx',
    respond(req => {
      const normalized = req.params.tx?.trim().toLowerCase() || '';
      return TransactionAggregator.fetch({hash: normalized }) 
    })
  );

  APIController.get(
    '/addresses/:address',
    respond(req =>
      BTCAddressAggregator.fetch({address: req.params.address, txPage: parseInt(req.query.page, 10)})
    )
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

  type SearchResult = {
    type: string;
    id: string;
  } | {
    success: false;
  };

  APIController.get(
    '/search/:query',
    respond(async (req) => {
      
      // TODO: add stx-address and name IDs to search array

      const { query } = req.params;

      const getOrFail = async <T>(promise: Promise<T>) => {
        try {
          const result = await promise;
          return result;
        } catch (error) {
          return null;
        }
      };

      const blockSearch = async (hashOrHeight: string) => {
        return BlockAggregator.fetch(hashOrHeight);
      };

      const searchResult = new Promise<SearchResult>((resolve, reject) => {
        Promise.all([
          getOrFail(TransactionAggregator.fetch({hash: query})).then(tx => {
            if (tx) {
              resolve({
                type: 'tx',
                id: tx.txid
              });
              return true;
            }
            return null;
          }),
          getOrFail(fetchAddress(query)).then(btcAddress => {
            if (btcAddress) {
              resolve({
                type: 'btc-address',
                id: query
              });
              return true;
            }
            return null;
          }),
          getOrFail(blockSearch(query)).then(block => {
            if (block) {
              resolve({
                type: 'block',
                id: block.hash
              });
              return true;
            }
            return null;
          }),
        ]).then(results => {
          if (results.every(r => !r)) {
            reject(new Error('Failed to find match'));
          }
        })
      });

      try {
        const result = await searchResult;
        return result;
      } catch (error) {
        return {
          success: false
        };
      }

    })
  );

  return APIController;
};

export default makeAPIController;

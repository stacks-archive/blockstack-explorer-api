const express = require('express');
const { decorateApp } = require('@awaitjs/express');
const Sentry = require('@sentry/node');

const { getTotals } = require('../lib/addresses');
const {
  fetchTX,
  fetchAddress,
  fetchNames,
  fetchNamespaceNames,
  fetchBlockHash,
} = require('../lib/client/core-api');

const NameOpsAggregator = require('../lib/aggregators/name-ops');
const BlocksAggregator = require('../lib/aggregators/blocks');
const NamespaceAggregator = require('../lib/aggregators/namespaces');
const BlockAggregator = require('../lib/aggregators/block');
const TotalNamesAggregator = require('../lib/aggregators/total-names');
const StacksAddressAggregator = require('../lib/aggregators/stacks-address');
const HomeInfoAggregator = require('../lib/aggregators/home-info');
const NameAggregator = require('../lib/aggregators/name');
const BTCAddressAggregator = require('../lib/aggregators/btc-address');

// const resJSON = (dataFn) => {}
const respond = dataFn => async (req, res) => {
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

const makeAPIController = (Genesis) => {
  const APIController = decorateApp(express.Router());
  const totals = getTotals(Genesis);

  APIController.getAsync('/accounts/global', async (req, res) => res.json(totals));

  APIController.getAsync('/accounts/:address', respond(async req => Genesis.accountsByAddress[req.params.address]));

  APIController.getAsync('/name-operations', respond(async () => {
    const nameOperations = await NameOpsAggregator.get();
    return {
      nameOperations,
    };
  }));

  APIController.getAsync('/names/:name', respond(async req => NameAggregator.fetch(req.params.name, req.query.page)));

  APIController.getAsync('/transactions/:tx', respond(req => fetchTX(req.params.tx)));

  APIController.getAsync('/addresses/:address', respond(async req => BTCAddressAggregator.fetch(req.params.address, req.query.page)));

  APIController.getAsync('/blocks', respond(async req => BlocksAggregator.fetch(req.query.date)));

  APIController.getAsync('/blocks/:hashOrHeight', respond(async (req) => {
    const { hashOrHeight } = req.params;
    let hash = hashOrHeight;
    if (hashOrHeight.toString().length < 10) {
      hash = await fetchBlockHash(hashOrHeight);
    }
    return BlockAggregator.fetch(hash);
  }));

  APIController.getAsync('/namespaces', respond(async () => NamespaceAggregator.fetch()));

  APIController.getAsync('/names', respond(async req => fetchNames(req.query.page || 0)));

  APIController.getAsync('/namespaces/:namespace', respond(async req => fetchNamespaceNames(req.params.namespace, req.query.page || 0)));

  APIController.getAsync('/name-counts', respond(async () => TotalNamesAggregator.fetch()));

  APIController.getAsync('/stacks/addresses/:address', respond(async req => StacksAddressAggregator.fetch(req.params.address)));

  APIController.getAsync('/home', respond(async () => HomeInfoAggregator.setter(totals)));

  APIController.getAsync('/search/:query', respond(async (req) => {
    const { query } = req.params;
    const getOrFail = async (promise) => {
      try {
        const result = await promise;
        return result;
      } catch (error) {
        return null;
      }
    };

    const blockSearch = async (hashOrHeight) => {
      let hash = hashOrHeight;
      if (hashOrHeight.toString().length < 10) {
        hash = await fetchBlockHash(hashOrHeight);
      }
      return BlockAggregator.fetch(hash);
    };

    const fetches = [
      getOrFail(fetchTX(query)),
      getOrFail(fetchAddress(query)),
      getOrFail(blockSearch(query)),
    ];

    const [tx, btcAddress, block] = await Promise.all(fetches);

    if (tx) {
      return {
        pathname: '/transaction/single',
        as: `/tx/${query}`,
        id: query,
        data: JSON.stringify(tx),
      };
    }
    if (btcAddress) {
      return {
        pathname: '/address/single',
        as: `/address/${query}`,
        id: query,
        address: query,
        data: btcAddress,
      };
    }
    if (block) {
      return {
        pathname: '/blocks/single',
        as: `/block/${block.hash}`,
        data: block,
        hash: query,
      };
    }

    return {
      success: false,
    };
  }));

  return APIController;
};

module.exports = makeAPIController;

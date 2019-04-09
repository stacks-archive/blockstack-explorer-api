const request = require('request-promise');
const moment = require('moment');
const blockstack = require('blockstack');
const Promise = require('bluebird');

moment.updateLocale('en', {
  relativeTime: {
    future: 'in %s',
    past: '%s ago',
    s: '1s',
    ss: '%ss',
    m: '1m',
    mm: '%dm',
    h: '1h',
    hh: '%dh',
    d: '1d',
    dd: '%dd',
    M: '1m',
    MM: '%dM',
    y: '1Y',
    yy: '%dY',
  },
});

const coreApi = process.env.CORE_API_URL || 'https://core.blockstack.org';
// const explorerApi = 'https://insight.blockstack.systems/insight-api';
const explorerApi = 'https://insight.bitpay.com/api';
const blockchainInfoApi = 'https://blockchain.info';

const PUBLIC_TESTNET_HOST = 'testnet.blockstack.org';

let configData = {
  blockstackAPIUrl: 'https://core.blockstack.org',
  blockstackNodeUrl: 'https://node.blockstack.org:6263',
  broadcastServiceUrl: 'https://broadcast.blockstack.org',
  utxoServiceUrl: 'https://bitcoin.blockstack.com',
  rpc: {
    username: 'blockstack',
    password: 'blockstacksystem',
  },
  logConfig: {
    level: 'debug',
    handleExceptions: true,
    timestamp: true,
    stringify: true,
    colorize: true,
    json: true,
  },
};

if (process.env.USE_TESTNET) {
  configData = {
    blockstackAPIUrl: `http://${PUBLIC_TESTNET_HOST}:16268`,
    blockstackNodeUrl: `http://${PUBLIC_TESTNET_HOST}:16264`,
    broadcastServiceUrl: `http://${PUBLIC_TESTNET_HOST}:16269`,
    utxoServiceUrl: `http://${PUBLIC_TESTNET_HOST}:18332`,
    rpc: {
      username: 'blockstack',
      password: 'blockstacksystem',
    },
    logConfig: {
      level: 'debug',
      handleExceptions: true,
      timestamp: true,
      stringify: true,
      colorize: true,
      json: true,
    },
  };
}

const network = new blockstack.network.LocalRegtest(
  configData.blockstackAPIUrl, configData.broadcastServiceUrl,
  new blockstack.network.BitcoindAPI(configData.utxoServiceUrl,
    { username: 'blockstack', password: 'blockstacksystem' }),
);

const fetchJSON = async (uri) => {
  try {
    const response = await request({
      uri,
      resolveWithFullResponse: true,
      time: true,
    });
    if (response.statusCode !== 200) {
      console.log(`${response.statusCode} when fetching ${uri}`);
      return null;
    }
    // console.log(response.elapsedTime / 1000);
    return JSON.parse(response.body);
  } catch (e) {
    // if (process.env.NODE_ENV !== 'test') {
    console.error(`Error fetching ${uri}: ${e}`);
    // }
    return null;
  }
};

/**
 * Addresses
 */
const fetchAddressCore = (address) => {
  const url = `${coreApi}/v1/addresses/bitcoin/${address}`;
  return fetchJSON(url);
};

const fetchAddressInfo = (address, limit = 10, offset = 0) => fetchJSON(`${blockchainInfoApi}/rawaddr/${address}?limit=${limit}&offset=${offset}`);

// const fetchAddressInsight = address => fetchJSON(`${explorerApi}/addr/${address}`);

const fetchAddress = async (address, limit = 0, offset = 0) => {
  const [coreData, insightData] = await Promise.all([
    fetchAddressCore(address),
    fetchAddressInfo(address, limit, offset),
  ]);
  if (!insightData) {
    return null;
  }
  return {
    ...coreData,
    ...insightData,
  };
};

/**
 * Names
 */
const fetchName = async (name) => {
  const url = `${coreApi}/v2/users/${name}`;
  const data = await fetchJSON(url);
  return data ? data[name] : data;
};

const fetchNameOperations = async (blockHeight) => {
  const url = `${coreApi}/v1/blockchains/bitcoin/operations/${blockHeight}`;
  const result = await fetchJSON(url);
  if (!result) {
    return [];
  }
  return result;
};

const fetchNameRecord = async (name, page = 0) => {
  const data = await fetchJSON(`${coreApi}/v1/names/${name}/history?page=${page}`);
  const nameops = Object.values(data)
    .map(op => op[0])
    .reverse();
  return {
    history: nameops,
    ...nameops[0],
  };
};

const convertTx = (tx) => {
  const value = tx.out.reduce(((accumulator, current) => accumulator + current.value * 10e-9), 0);
  const vout = tx.out.map(output => ({
    ...output,
    value: output.value * 10e-9,
    scriptPubKey: {
      hex: output.script,
    },
  }));
  const vin = tx.inputs.map(input => ({
    ...input,
    addr: input.prev_out && input.prev_out.addr,
  }));
  return {
    ...tx,
    vin,
    vout,
    txid: tx.hash,
    value,
    valueOut: value,
    blockheight: tx.block_height,
  };
};

/**
 * Transactions
 */
const fetchTX = async (hash) => {
  const tx = await fetchJSON(`${blockchainInfoApi}/rawtx/${hash}`);
  return convertTx(tx);
};

/**
 * Blocks
 */

const fetchBlocks = async (date) => {
  const mom = date ? moment(date) : moment();
  const endOfDay = mom.utc().endOf('day').valueOf();
  const url = `${blockchainInfoApi}/blocks/${endOfDay}?format=json`;
  const { blocks } = await fetchJSON(url);
  return blocks;
};

const fetchBlockHash = async (height) => {
  const data = await fetchJSON(`${explorerApi}/block-index/${height}`);
  return data.blockHash;
};

const fetchBlockInfo = hash => fetchJSON(`${blockchainInfoApi}/rawblock/${hash}`);

const fetchBlock = async (hashOrHeight) => {
  let hash = hashOrHeight;
  if (hashOrHeight.toString().length < 10) {
    hash = await fetchBlockHash(hashOrHeight);
  }
  const block = await fetchBlockInfo(hash);
  if (!block) {
    return null;
  }
  block.nameOperations = await fetchNameOperations(block.height);
  block.transactions = block.tx.map(convertTx);
  const { tx, ...rest } = block;
  return {
    ...rest,
    txCount: block.n_tx,
  };
};

const fetchNamespaceNameCount = (namespace) => {
  const url = `${coreApi}/v1/blockchains/bitcoin/name_count?all=1&id=${namespace}`;
  return fetchJSON(url);
};

const fetchNamespaces = () => fetchJSON(`${coreApi}/v1/namespaces`);

const fetchNames = page => fetchJSON(`${coreApi}/v1/names?page=${page}`);

const fetchNamespaceNames = (namespace, page) => fetchJSON(`${coreApi}/v1/namespaces/${namespace}/names?page=${page}`);

const fetchTransactionSubdomains = txid => fetchJSON(`${coreApi}/v1/subdomains/${txid}`);

const fetchTotalNames = () => fetchJSON(`${coreApi}/v1/blockchains/bitcoin/name_count`);
const fetchTotalSubdomains = () => fetchJSON(`${coreApi}/v1/blockchains/bitcoin/subdomains_count`);

const fetchRawTxInfo = async (hash) => {
  const url = `https://blockchain.info/rawtx/${hash}?format=hex`;
  try {
    return request(url);
  } catch (error) {
    return null;
  }
};

module.exports = {
  fetchName,
  fetchAddress,
  fetchTX,
  fetchBlocks,
  fetchNameOperations,
  fetchNameRecord,
  fetchBlock,
  fetchNamespaceNameCount,
  fetchNamespaces,
  fetchNames,
  fetchNamespaceNames,
  fetchBlockInfo,
  fetchBlockHash,
  fetchTransactionSubdomains,
  fetchTotalNames,
  fetchTotalSubdomains,
  network,
  fetchRawTxInfo,
  convertTx,
};

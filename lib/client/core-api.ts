import request from 'request-promise';
import moment from 'moment';
import blockstack from 'blockstack';
import { Transaction } from 'bitcoinjs-lib';
import RPCClient from 'bitcoin-core';
import { getTX } from '../bitcore-db/queries';
import { decodeTx } from '../btc-tx-decoder';


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
const bitcoreApi = process.env.BITCORE_URL;

const PUBLIC_TESTNET_HOST = 'testnet.blockstack.org';

const rpcClient = new RPCClient({
  host: process.env.BITCOIND_HOST,
  username: process.env.BITCOIND_USERNAME,
  password: process.env.BITCOIND_PASSWORD,
  port: process.env.BITCOIND_PORT,
  // ssl: true
});

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

// const network = new blockstack.network.LocalRegtest(
//   configData.blockstackAPIUrl, configData.broadcastServiceUrl,
//   new blockstack.network.BitcoindAPI(configData.utxoServiceUrl,
//                                      { username: 'blockstack', password: 'blockstacksystem' }),
// );

const fetchJSON = async (uri: string) => {
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
export const fetchAddressCore = (address: string) => {
  const url = `${coreApi}/v1/addresses/bitcoin/${address}`;
  return fetchJSON(url);
};

export const fetchAddressInfo = (address: string, limit = 10, offset = 0) => fetchJSON(`${blockchainInfoApi}/rawaddr/${address}?limit=${limit}&offset=${offset}`);

// const fetchAddressInsight = address => fetchJSON(`${explorerApi}/addr/${address}`);

export const fetchAddress = async (address: string, limit = 0, offset = 0) => {
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
export const fetchName = async (name: string) => {
  const url = `${coreApi}/v2/users/${name}`;
  const data = await fetchJSON(url);
  return data ? data[name] : data;
};

export const fetchNameOperations = async (blockHeight: number) => {
  const url = `${coreApi}/v1/blockchains/bitcoin/operations/${blockHeight}`;
  const result = await fetchJSON(url);
  if (!result) {
    return [];
  }
  return result;
};

export const fetchNameRecord = async (name, page = 0) => {
  const data = await fetchJSON(`${coreApi}/v1/names/${name}/history?page=${page}`);
  const nameops = Object.values(data)
    .map(op => op[0])
    .reverse();
  return {
    history: nameops,
    ...nameops[0],
  };
};

export const convertTx = (tx) => {
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

export const fetchRawTxInfo = async (hash: string) => {
  const txRaw = await rpcClient.getRawTransaction(hash);
  return txRaw;
};


export const fetchTX = async (hash: string) => {
  // const tx = await fetchJSON(`${blockchainInfoApi}/rawtx/${hash}`);
  // return convertTx(tx);
  const tx = await getTX(hash);
  const rawTx = await fetchRawTxInfo(hash);
  const decodedTx = Transaction.fromHex(<string>rawTx);
  // console.log(decodedTx);
  return decodeTx(decodedTx, tx);
};

/**
 * Blocks
 */

export const fetchBlocks = async (date: string) => {
  const mom = date ? moment(date) : moment();
  const endOfDay = mom.utc().endOf('day').valueOf();
  const url = `${blockchainInfoApi}/blocks/${endOfDay}?format=json`;
  const { blocks } = await fetchJSON(url);
  return blocks;
};

export const fetchBlockHash = async (height: number) => {
  const data = await fetchJSON(`${explorerApi}/block-index/${height}`);
  return data.blockHash;
};

export const fetchBlockInfo = (hash: string) => fetchJSON(`${blockchainInfoApi}/rawblock/${hash}`);

export const fetchBlock = async (hashOrHeight: string | number) => {
  let hash = hashOrHeight;
  if (hashOrHeight.toString().length < 10) {
    hash = await fetchBlockHash(<number>hashOrHeight);
  }
  const block = await fetchBlockInfo(<string>hash);
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

export const fetchNamespaceNameCount = (namespace: string) => {
  const url = `${coreApi}/v1/blockchains/bitcoin/name_count?all=1&id=${namespace}`;
  return fetchJSON(url);
};

export const fetchNamespaces = () => fetchJSON(`${coreApi}/v1/namespaces`);

export const fetchNames = (page: number) => fetchJSON(`${coreApi}/v1/names?page=${page}`);

export const fetchNamespaceNames = (namespace: string, page: number) => fetchJSON(`${coreApi}/v1/namespaces/${namespace}/names?page=${page}`);

export const fetchTransactionSubdomains = (txid: string) => fetchJSON(`${coreApi}/v1/subdomains/${txid}`);

export const fetchTotalNames = () => fetchJSON(`${coreApi}/v1/blockchains/bitcoin/name_count`);
export const fetchTotalSubdomains = () => fetchJSON(`${coreApi}/v1/blockchains/bitcoin/subdomains_count`);


export default {
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
  // network,
  fetchRawTxInfo,
  convertTx,
};

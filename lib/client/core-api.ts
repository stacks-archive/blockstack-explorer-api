import * as request from 'request-promise-native';
import * as moment from 'moment';
import { network as BlockstackNetwork } from 'blockstack';
import * as RPCClient from 'bitcoin-core';
import * as dotenv from 'dotenv';
import * as Sentry from '@sentry/node';
import { 
  getAddressTransactions, BitcoreAddressTxInfo, getAddressBtcBalance, 
  BitcoreAddressBalance,
} from '../bitcore-db/queries';
import { getStopwatch, isDevEnv, Json, logError } from '../utils';


dotenv.config();

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
    yy: '%dY'
  }
});

const coreApi = process.env.CORE_API_URL || 'https://core.blockstack.org';

const PUBLIC_TESTNET_HOST = 'testnet.blockstack.org';

const rpcClient = new RPCClient({
  host: process.env.BITCOIND_HOST,
  username: process.env.BITCOIND_USERNAME,
  password: process.env.BITCOIND_PASSWORD,
  port: process.env.BITCOIND_PORT,
  ssl: false
});

let configData = {
  blockstackAPIUrl: coreApi,
  blockstackNodeUrl: 'https://nodex.blockstack.org:6263',
  broadcastServiceUrl: 'https://broadcastx.blockstack.org',
  utxoServiceUrl: 'https://bitcoinx.blockstack.com',
  rpc: {
    username: 'blockstack',
    password: 'blockstacksystem'
  },
  logConfig: {
    level: 'debug',
    handleExceptions: true,
    timestamp: true,
    stringify: true,
    colorize: true,
    json: true
  }
};

if (process.env.USE_TESTNET) {
  configData = {
    blockstackAPIUrl: `http://${PUBLIC_TESTNET_HOST}:16268`,
    blockstackNodeUrl: `http://${PUBLIC_TESTNET_HOST}:16264`,
    broadcastServiceUrl: `http://${PUBLIC_TESTNET_HOST}:16269`,
    utxoServiceUrl: `http://${PUBLIC_TESTNET_HOST}:18332`,
    rpc: {
      username: 'blockstack',
      password: 'blockstacksystem'
    },
    logConfig: {
      level: 'debug',
      handleExceptions: true,
      timestamp: true,
      stringify: true,
      colorize: true,
      json: true
    }
  };
}

export const network = new BlockstackNetwork.LocalRegtest(
  configData.blockstackAPIUrl,
  configData.broadcastServiceUrl,
  new BlockstackNetwork.BitcoindAPI(configData.utxoServiceUrl, {
    username: 'blockstack',
    password: 'blockstacksystem'
  })
);

const fetchJSON = async <T extends Json>(uri: string, nullOn404 = false): Promise<T> => {
  const stopwatch = getStopwatch();
  try {
    const response = await request({
      uri,
      resolveWithFullResponse: true,
      time: true,
      simple: false,
    });
    if (response.statusCode === 404 && nullOn404) {
      return null;
    }
    if (response.statusCode !== 200) {
      const errMsg = `${response.statusCode} - ${response.body}`
      throw new Error(errMsg);
    }
    return JSON.parse(response.body);
  } catch (e) {
    const errMsg = `Error fetching ${uri}: ${e}`
    console.error(errMsg);
    throw new Error(errMsg);
  } finally {
    const elapsed = stopwatch.getElapsedSeconds();
    if (elapsed > 5) {
      const warning = `Warning: core node API fetch took ${elapsed.toFixed(3)} seconds for ${uri}`;
      logError(warning);
    }
    else if (isDevEnv) {
      console.log(`Core node API fetch took ${elapsed.toFixed(3)} seconds for ${uri}`);
    }
  }
};

export type FetchAddressCoreResult = { 
  names: string[];
};

/**
 * Addresses
 */
export const fetchAddressCore = async (address: string): Promise<FetchAddressCoreResult> => {
  const url = `${coreApi}/v1/addresses/bitcoin/${address}`;
  const data = await fetchJSON(url);
  return data as FetchAddressCoreResult;
};

export type BlockchainInfoTx = {
  hash: string;
  ver: number;
  vin_sz: number;
  vout_sz: number;
  lock_time: string;
  size: number;
  relayed_by: string;
  block_height: number;
  tx_index: string;
  inputs: {
    prev_out: {
      hash: string;
      value: string;
      tx_index: string;
      n: string;
      addr?: string;
    };
    script: string;
  }[];
  out: {
    value: string;
    hash: string;
    script: string;
    addr?: string;
  }[];
};

export type BlockchainAddressInfo = {
  hash160: string;
  address: string;
  n_tx: number;
  n_unredeemed: number;
  total_received: number;
  total_sent: number;
  final_balance: number;
};

export type FetchAddressInfoResult = BlockchainAddressInfo & {
  txs: BlockchainInfoTx[];
};

export type FetchAddressResult = {
  blockstackCoreData: FetchAddressCoreResult;
  btcBalanceInfo: BitcoreAddressBalance;
  btcTransactions: BitcoreAddressTxInfo[];
};

export const fetchAddress = async (address: string, page = 0, count = 20): Promise<FetchAddressResult | null> => {
  const [coreData, btcBalanceInfo, bitcoreTxs] = await Promise.all([
    // TODO: refactor to use pg query rather than core node API
    fetchAddressCore(address),
    getAddressBtcBalance(address),
    getAddressTransactions(address, page, count)
  ]);

  return {
    blockstackCoreData: coreData,
    btcBalanceInfo: btcBalanceInfo,
    btcTransactions: bitcoreTxs,
  };
};

export type FetchNameResult = {
  [name: string]: FetchNameEntry;
};

export type FetchNameEntry = {
  owner_address?: string;
  ownerAddress?: string;
  profile: {
    "@context": string;
    "@type": string;
    account: {
      "@type": string;
      identifier: string;
      placeholder: boolean;
      proofType: string;
      proofUrl: string;
      service: string;
      verified?: boolean;
    }[];
    api: {
      gaiaHubConfig: {
        url_prefix: string;
      };
      gaiaHubUrl: string;
    };
    apps: {
      [appUrl: string]: string;
    };
    image: {
      "@type": string;
      contentUrl: string;
      name: string;
    }[];
    name: string;
  };
  public_key: string;
  verifications: {
    identifier: string;
    proof_url: string;
    service: string;
    valid: boolean;
  }[];
  zone_file: {
    $origin: string;
    $ttl: number;
    uri: {
      name: string;
      priority: number;
      target: string;
      weight: number;
    }[];
  };
};

/**
 * Names
 */
export const fetchName = async (name: string): Promise<FetchNameEntry | null> => {
  const url = `${coreApi}/v2/users/${name}`;
  const data = await fetchJSON<FetchNameResult>(url, true);
  // TODO: What is the actual intended return type?
  return data ? data[name] : (data as unknown as FetchNameEntry);
};

export type BlockstackCoreBitcoinBlockNameOps = {
  address: string;
  block_number: number;
  consensus_hash: string;
  first_registered: number;
  importer: string;
  importer_address: string;
  last_renewed: number;
  name: string;
  name_consensus_hash: string;
  name_hash128: string;
  namespace_block_number: number;
  namespace_id: string;
  op: string;
  op_fee: number;
  opcode: string;
  preorder_block_number: number;
  preorder_hash: string;
  revoked: boolean;
  sender: string;
  sender_pubkey: string;
  token_fee: string;
  txid: string;
  value_hash: string;
  vtxindex: number;
};

export const fetchNameOperations = async (blockHeight: number): Promise<BlockstackCoreBitcoinBlockNameOps[]> => {
  const url = `${coreApi}/v1/blockchains/bitcoin/operations/${blockHeight}`;
  const result = await fetchJSON<BlockstackCoreBitcoinBlockNameOps[]>(url);
  if (!result) {
    return [];
  }
  return result;
};

export type ConvertTxResult = BlockchainInfoBlockTx & {
  vin: {
    addr: string;
    sequence: number;
    witness: string;
    script: string;
    index: number;
    prev_out?: BlockchainInfoBlockTxOutput;
  }[];
  vout: {
    value: number;
    scriptPubKey: {
      hex: string;
    };
    type: number;
    spent: boolean;
    spending_outpoints: {
      tx_index: number;
      n: number;
    }[];
    tx_index: number;
    script: string;
    n: number;
    addr?: string;
  }[];
  txid: string;
  value: number;
  valueOut: number;
  blockheight: number;
};

export const convertTx = (tx: BlockchainInfoBlockTx): ConvertTxResult => {
  const value: number = tx.out.reduce(
    (accumulator, current) => accumulator + current.value * 10e-9,
    0
  );
  const vout = tx.out.map((output: BlockchainInfoBlockTxOutput) => ({
    ...output,
    value: output.value * 10e-9,
    scriptPubKey: {
      hex: output.script
    }
  }));
  const vin = tx.inputs.map((input: BlockchainInfoBlockTxInput) => ({
    ...input,
    addr: input.prev_out && input.prev_out.addr
  }));
  return {
    ...tx,
    vin,
    vout,
    txid: tx.hash,
    value,
    valueOut: value,
    blockheight: tx.block_height
  };
};

/**
 * Transactions
 */
export const fetchRawTxInfo = async (hash: string): Promise<string> => {
  try {
    const txRaw = await rpcClient.getRawTransaction(hash).catch((err: any) => {
      throw err;
    });
    return txRaw as string;
  } catch (error) {
    throw error;
  }
};

export type BlockchainInfoBlock = {
  height: number;
  hash: string;
  time: number;
  main_chain: boolean;
};

export type BlockchainInfoRawBlock = {
  ver: number;
  next_block: any[];
  time: number;
  bits: number;
  fee: number;
  nonce: number;
  n_tx: number;
  size: number;
  block_index: number;
  main_chain: boolean;
  height: number;
  weight: number;
  tx: BlockchainInfoBlockTx[];
  hash: string;
  prev_block: string;
  mrkl_root: string;
};

export type BlockchainInfoBlockTx = {
  hash: string;
  ver: number;
  vin_sz: number;
  vout_sz: number;
  size: number;
  weight: number;
  fee: number;
  relayed_by: string;
  lock_time: number;
  tx_index: number;
  double_spend: boolean;
  result: number;
  balance: number;
  time: number;
  block_index: number;
  block_height: number;
  inputs: BlockchainInfoBlockTxInput[];
  out: BlockchainInfoBlockTxOutput[];
  rbf?: boolean;
};

export type BlockchainInfoBlockTxInput = {
  sequence: number;
  witness: string;
  script: string;
  index: number;
  prev_out?: BlockchainInfoBlockTxOutput;
};

export type BlockchainInfoBlockTxOutput = {
  type: number;
  spent: boolean;
  value: number;
  spending_outpoints: {
    tx_index: number;
    n: number;
  }[];
  tx_index: number;
  script: string;
  n: number;
  addr?: string;
};

export type BlockchainInfoBlockResult = Omit<BlockchainInfoRawBlock, 'tx'> & {
  nameOperations: BlockstackCoreBitcoinBlockNameOps[];
  transactions: ConvertTxResult[];
  txCount: number;
};

export type NamespaceNameCountResult = {
  names_count: number;
};
export const fetchNamespaceNameCount = async (namespace: string): Promise<NamespaceNameCountResult> => {
  const url = `${coreApi}/v1/blockchains/bitcoin/name_count?all=1&id=${namespace}`;
  const data: NamespaceNameCountResult = await fetchJSON(url);
  return data;
};

export const fetchNamespaces = async (): Promise<string[]> => {
  const data: string[] = await fetchJSON(`${coreApi}/v1/namespaces`);
  return data;
};

export const fetchNames = async (page: number): Promise<string[]> => {
  const data: string[] = await fetchJSON(`${coreApi}/v1/names?page=${page}`);
  if (!data) {
    return [];
  }
  return data;
};

export const fetchNamespaceNames = async (namespace: string, page: number): Promise<string[]> => {
  const data: string[] = await fetchJSON(`${coreApi}/v1/namespaces/${namespace}/names?page=${page}`);
  return data;
};

export type TotalNamesResult = {
  names_count: number;
};
export const fetchTotalNames = async (): Promise<TotalNamesResult> => {
  const data: TotalNamesResult = await fetchJSON(`${coreApi}/v1/blockchains/bitcoin/name_count`);
  return data;
};

export type TotalSubdomainsResult = {
  names_count: number;
};

/**
 * @deprecated Use the faster query `getTotalSubdomainCount()` from the pg db queries module.
 */
export const fetchTotalSubdomains = async (): Promise<TotalSubdomainsResult> => {
  const data: TotalSubdomainsResult = await fetchJSON(`${coreApi}/v1/blockchains/bitcoin/subdomains_count`);
  return data;
};


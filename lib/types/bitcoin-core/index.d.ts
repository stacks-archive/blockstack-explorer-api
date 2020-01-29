declare module 'bitcoin-core' {

  export = BitcoinCore
  
  namespace BitcoinCore {
    interface ClientConstructorOption {
      agentOptions?: any;
      headers?: boolean;
      host?: string;
      logger?: Function;
      network?: 'mainnet' | "regtest" | "testnet";
      password?: string;
      port?: string | number;
      ssl?: any;
      timeout?: number;
      username?: string;
      version?: string;
    }

    interface Requester {
      unsupported?: any[];
      version?: any;
    }

    interface Parser {
      headers: boolean;
    }

    type ScriptDecoded = {
      asm: string;
      hex: string;
      type: string;
      reqSigs: number;
      addresses: string[];
      ps2h?: string;
    }
    type FundRawTxOptions = {
      changeAddress?: string;
      chnagePosition?: number;
      includeWatching?: boolean;
      lockUnspents?: boolean;
      feeRate?: number;
      subtractFeeFromOutputs?: number[];
      replaceable?: boolean;
      conf_target?: number;
      estimate_mode: FeeEstimateMode;
    }

    type FeeEstimateMode = "UNSET" | "ECONOMICAL" | "CONSERVATIVE"

    type TxStats = {
      time: number;
      txcount: number;
      window_final_block_hash?: string;
      window_block_count?: number;
      window_tx_count?: number;
      window_interval?: number;
      txrate: number;
    }

    type AddedNodeInfo = {
      addednode: string;
      connected: boolean;
      addresses: {
        address: string;
        connected: "inbound" | "outbound";
      }[];
    }

    type MemoryStats = {
      locked: {
        used: number;
        free: number;
        total: number;
        locked: number;
        chunks_used: number;
        chunks_free: number;
      };
    }

    type NetworkInfo = {
      version: number;
      subversion: string;
      protocolversion: number;
      localservices: string;
      localrelay: boolean;
      timeoffset: number;
      connections: number;
      networkactive: boolean;
      networks: {
        name: string;
        limited: boolean;
        reachable: boolean;
        proxy: string;
        proxy_randomize_credentials: boolean;
      }[];
      relayfee: number;
      incrementalfee: number;
      localaddresses: {
        address: string;
        port: number;
        score: number;
      }[];
      warnings?: string;
    }

    type PeerInfo = {
      id: number;
      addr: string;
      addrbind: string;
      addrlocal: string;
      services: string;
      relaytxs: boolean;
      lastsend: number;
      lastrecv: number;
      bytessent: number;
      bytesrecv: number;
      conntime: number;
      timeoffset: number;
      pingtime: number;
      minping: number;
      version: number;
      subver: string;
      inbound: boolean;
      addnode: boolean;
      startinheight: number;
      banscore: number;
      synced_headers: number;
      synced_blocks: number;
      inflight: number[];
      whitelisted: boolean;
      bytessent_per_msg: {
        [key: string]: number;
      };
      byterecv_per_msg: {
        [key: string]: number;
      };
    }

    type NetTotals = {
      totalbytesrecv: number;
      totalbytessent: number;
      timemlillis: number;
      uploadtarget: {
        timeframe: number;
        target: number;
        target_reached: boolean;
        save_historical_blocks: boolean;
        bytes_left_in_cycle: number;
        time_lef_in_cycle: number;
      };
    }

    type ChainInfo = {
      chain: string;
      blocks: number;
      headers: number;
      bestblockchash: number;
      difficulty: number;
      mediantime: number;
      verificationprogress: number;
      initialblockdownload: boolean;
      chainwork: string;
      size_on_disk: number;
      pruned: boolean;
      pruneheight: number;
      automatic_pruning: boolean;
      prune_target_size: number;
      softforks: {
        id: string;
        version: number;
        reject: {
          status: boolean;
        };
      }[];
      bip9_softforks: {
        [key: string]: {
          status: "defined" | "started" | "locked_in" | "active" | "failed";
        };
      }[];
      warnings?: string;
    }
    type ChainTip = {
      height: number;
      hash: string;
      branchlen: number;
      status: "active" | "valid-fork" | "valid-headers" | "headers-only" | "invalid";
    }
    type Outpoint = { id: string; index: number }
    type UTXO = {
      height: number;
      value: number;
      scriptPubkey: {
        asm: string;
        hex: string;
        reqSigs: number;
        type: string;
        addresses: string[];
      };
    }

    type UnspentTxInfo = {
      txid: string;
      vout: number;
      address: string;
      acount: string;
      scriptPubKey: string;
      amount: number;
      confirmations: number;
      redeemScript: string;
      spendable: boolean;
      solvable: boolean;
      safe: boolean;
    }

    type PrevOut = {
      txid: string;
      vout: number;
      scriptPubKey: string;
      redeemScript?: string;
      amount: number;
    }

    type UTXOStats = {
      height: number;
      bestblock: string;
      transactions: number;
      txouts: number;
      bogosize: number;
      hash_serialized_2: string;
      disk_size: number;
      total_amount: number;
    }
    type MempoolContent = {
      [key: string]: {
        size: number;
        fee: number;
        modifiedfee: number;
        time: number;
        height: number;
        descendantcount: number;
        descendantsize: number;
        descendantfees: number;
        ancestorcount: number;
        ancestorsize: number;
        ancestorfees: number;
        wtxid: string;
        depends: string[];
      };
    }

    type DecodedRawTransaction = {
      txid: string;
      hash: string;
      size: number;
      vsize: number;
      version: number;
      locktime: number;
      vin: TxIn[];
      vout: TxOut[];
    }

    interface FetchedRawTransaction extends DecodedRawTransaction {
      hex: string;
      blockhash: string;
      confirmations: number;
      time: number;
      blocktime: number;
    }

    type MiningInfo = {
      blocks: number;
      currentblockweight: number;
      currentblocktx: number;
      difficulty: number;
      networkhashps: number;
      pooledtx: number;
      chain: "main" | "test" | "regtest";
      warnings?: string;
    }

    type MempoolInfo = {
      size: number;
      bytes: number;
      usage: number;
      maxmempol: number;
      mempoolminfee: number;
      minrelaytxfee: number;
    }
    type BlockHeader = {
      hash: string;
      confirmations: number;
      height: number;
      version: number;
      versionHex: string;
      merkleroot: string;
      time: number;
      mediantime: number;
      nonce: number;
      bits: string;
      difficulty: number;
      chainwork: string;
      previoutsblockchash: string;
    }
    type Block = {
      hash: string;
      confirmations: number;
      strippedsize: number;
      size: number;
      weight: number;
      height: number;
      version: number;
      verxionHex: string;
      merkleroot: string;
      tx: Transaction[] | string;
      hex: string;
      time: number;
      mediantime: number;
      nonce: number;
      bits: string;
      difficulty: number;
      chainwork: string;
      previousblockhash: string;
      nextblockchash?: string;
    }
    type Transaction = {
      txid: string;
      hash: string;
      version: number;
      size: number;
      vsize: number;
      locktime: number;
      vin: TxIn[];
      vout: TxOut[];
    }

    type TxIn = {
      txid: string;
      vout: number;
      scriptSig: {
        asm: string;
        hex: string;
      };
      txinwitness?: string[];
      sequence: number;
    }

    type TxInForCreateRaw = {
      txid: string;
      vout: number;
      sequence?: number;
    }

    type TxOut = {
      value: number;
      n: number;
      scriptPubKey: {
        asm: string;
        hex: string;
        reqSigs: number;
        type: scriptPubkeyType;
        addresses: string[];
      };
    }

    type TxOutForCreateRaw = {
      address: string;
      data: string;
    }

    type TxOutInBlock = {
      bestblock: string;
      confirmations: number;
      value: number;
      scriptPubKey: {
        asm: string;
        hex: string;
        reqSigs: number;
        type: scriptPubkeyType;
        addresses: string[];
      };
      coinbase: boolean;
    }

    type DecodedScript = {
      asm: string;
      hex: string;
      type: string;
      reqSigs: number;
      addresses: string[];
      p2sh: string;
    }

    type WalletTransaction = {
      amount: number;
      fee: number;
      confirmations: number;
      blockhash: string;
      blockindex: number;
      blocktime: number;
      txid: string;
      time: number;
      timereceived: number;
      "bip125-replaceable": "yes" | "no" | "unknown";
      details: {
        account: string;
        address: string;
        category: "send" | "receive";
        amount: number;
        label?: string;
        vout: number;
        fee: number;
        abandoned: number;
      }[];
      hex: string;
    }

    type WalletInfo = {
      walletname: string;
      walletversion: number;
      balance: number;
      unconfirmed_balance: number;
      immature_balance: number;
      txcount: number;
      keypoololdest: number;
      keypoolsize: number;
      paytxfee: number;
      hdmasterkeyid: string;
    }

    type scriptPubkeyType = string

    type SigHashType = "ALL" | "NONE" | "SINGLE" | "ALL|ANYONECANPAY" | "NONE|ANYONECANPAY" | "SINGLE|ANYONECANPAY"

    type SignRawTxResult = {
      hex: string;
      complete: boolean;
      errors?: {
        txid: string;
        vout: number;
        scriptSig: string;
        sequence: number;
        error: string;
      }[];
    }

    type ValidateAddressResult = {
      isvalid: boolean;
      address?: string;
      scriptPubKey?: string;
      ismine?: boolean;
      iswatchonly?: boolean;
      isscript?: boolean;
      script?: string;
      hex?: string;
      addresses?: string[];
      sigsrequired?: number;
      pubkey?: string;
      iscompressed?: boolean;
      account?: string;
      timestamp?: number;
      hdkeypath?: string;
      hdmasterkeyid?: string;
    }

    type ImportMultiRequest = {
      scriptPubKey: string | { address: string };
      timestamp: number | "now";
      redeemScript?: string;
      pubkeys?: string[];
      keys?: string[];
      internal?: boolean;
      watchonly?: boolean;
      label?: string;
    }

    type Received = {
      involvesWatchonly?: boolean;
      account: string;
      amount: number;
      confirmations: number;
      label: string;
    }

    type ListUnspentOptions = {
      minimumAmount: number | string;
      maximumAmount: number | string;
      maximumCount: number | string;
      minimumSumAmount: number | string;
    }

    type ReceivedByAccount = Received

    type ReceivedByAddress = {
      address: string;
      txids: string[];
    } & Received

    type RestExtension = "json" | "bin" | "hex"

    type MethodNameInLowerCase = "getbestblockhash" |
    "getblock" |
    "getblockchaininfo" |
    "getblockcount" |
    "getblockhash" |
    "getblockheader" |
    "getchaintips" |
    "getchaintxstats" |
    "getdifficulty" |
    "getmempoolancestors" |
    "getmempooldescendants" |
    "getmempoolentry" |
    "getmempoolinfo" |
    "getrawmempool" |
    "gettxout" |
    "gettxoutproof" |
    "gettxoutsetinfo" |
    "preciousblock" |
    "pruneblockchain" |
    "verifychain" |
    "verifytxoutproof" |
    "getinfo" |
    "getmemoryinfo" |
    "help" |
    "stop" |
    "uptime" |
    "generate" |
    "generatetoaddress" |
    "getblocktemplate" |
    "getmininginfo" |
    "getnetworkhashps" |
    "prioritisetransaction" |
    "submitblock" |
    "addnode" |
    "clearbanned" |
    "disconnectnode" |
    "getaddednodeinfo" |
    "getconnectioncount" |
    "getnettotals" |
    "getnetworkinfo" |
    "getpeerinfo" |
    "istbanned" |
    "ping" |
    "setban" |
    "setnetworkactive" |
    "combinerawtransaction" |
    "createrawtransaction" |
    "decoderawtransaction" |
    "decodescript" |
    "fundrawtransaction" |
    "getrawtransaction" |
    "sendrawtransaction" |
    "signrawtransaction" |
    "createmultisig" |
    "estimatefee" |
    "estimatesmartfee" |
    "signmessagewithprivkey" |
    "validateaddress" |
    "verifymessage" |
    "abandontransaction" |
    "abortrescan" |
    "addmultisigaddress" |
    "addwitnessaddress" |
    "backupwallet" |
    "bumpfee" |
    "dumpprivkey" |
    "dumpwallet" |
    "encryptwallet" |
    "getaccount" |
    "getaccountaddress" |
    "getaddressesbyaccount" |
    "getbalance" |
    "getnewaddress" |
    "getrawchangeaddress" |
    "getreceivedbyaccount" |
    "getreceivedbyaddress" |
    "gettransaction" |
    "getunconfirmedbalance" |
    "getwalletinfo" |
    "importaddress" |
    "importmulti" |
    "importprivkey" |
    "importprunedfunds" |
    "importpubkey" |
    "importwallet" |
    "keypoolrefill" |
    "listaccounts" |
    "listaddressgroupings" |
    "listlockunspent" |
    "listreceivedbyaccount" |
    "listreceivedbyaddress" |
    "listsinceblock" |
    "listtransactions" |
    "listunspent" |
    "listwallets" |
    "lockunspent" |
    "move" |
    "removeprunedfunds" |
    "sendfrom" |
    "sendmany" |
    "sendtoaddress" |
    "setaccount" |
    "settxfee" |
    "signmessage"

    type BatchOption = {
      method: MethodNameInLowerCase;
      parameters: any;
    }
    type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;

    type BumpFeeOption = {
      confTarget?: number;
      totalFee?: number;
      replaceable?: boolean;
      estimate_mode?: FeeEstimateMode;
    }

    type WalletTxBase = {
      account: string;
      address: string;
      category: "send" | "receive";
      amount: number;
      vout: number;
      fee: number;
      confirmations: number;
      blockhash: string;
      blockindex: number;
      blocktime: number;
      txid: string;
      time: number;
      timereceived: number;
      walletconflicts: string[];
      "bip125-replaceable": "yes" | "no" | "unknown";
      abandoned?: boolean;
      comment?: string;
      label: string;
      to?: string;
    }

    type TransactionInListSinceBlock = {

    } & WalletTxBase

    type ListSinceBlockResult = {
      transactions: TransactionInListSinceBlock[];
      removed?: TransactionInListSinceBlock[];
      lastblock: string;
    }

    type ListTransactionsResult = {
      trusted: boolean;
      otheraccount?: string;
      abandoned?: boolean;
    } & WalletTxBase

    type AddressGrouping = [string, number] | [string, number, string]
  }

  class BitcoinCore {
    private readonly request: any;
    private readonly requests: BitcoinCore.Requester;
    private readonly parser: BitcoinCore.Parser;

    constructor(clientOption?: BitcoinCore.ClientConstructorOption);

    abandonTransaction(txid: string): Promise<void>;

    abortRescan(): Promise<void>;

    addMultiSigAddress(nrequired: number, keys: string[], account?: string): Promise<string>;

    addNode(node: string, command: "add" | "remove" | "onentry"): Promise<void>;

    addWitnessAddress(address: string): Promise<void>;

    backupWallet(destination: string): Promise<void>;

    bumpFee(
      txid: string, options?: BitcoinCore.BumpFeeOption
    ): Promise<{ txid: string; origfee: number; fee: number; error?: string[] }>;

    clearBanned(): Promise<void>;

    combineRawTransaction(txs: string[]): Promise<string>;

    // TODO: fix
    // command<R extends ReturnType<keyof BitcoinCore>>(methods: BitcoinCore.BatchOption[]): Promise<ReadonlyArray<R>>;

    createMultiSig(nrequired: number, keys: string[]): Promise<{ address: string; redeemScript: string }>;

    createRawTransaction(inputs: BitcoinCore.TxInForCreateRaw[],
      outputs: BitcoinCore.TxOutForCreateRaw,
      locktime: number,
      replacable: boolean): Promise<string>;

    /**
     * @deprecated
     */
    createWitnessAddress(...args: any[]): void;

    decodeRawTransaction(hexstring: string): Promise<BitcoinCore.DecodedRawTransaction>;

    decodeScript(hexstring: string): Promise<BitcoinCore.ScriptDecoded>;

    disconnectNode(address?: string, nodeid?: number): Promise<void>;

    dumpPrivKey(address: string): Promise<string>;

    dumpWallet(filename: string): Promise<{ filename: string }>;

    encryptWallet(passphrase: string): Promise<void>;

    estimateFee(nblock: number): Promise<number>;

    /**
     * @deprecated
     */
    estimatePriority(...args: any[]): void;

    estimateSmartFee(conf_target: number,
      estimate_mode?: BitcoinCore.FeeEstimateMode): Promise<{ feerate?: number; errors?: string[]; blocks?: number }>;

    /**
     * @deprecated
     */
    estimateSmartPriority(...args: any[]): void;

    fundRawTransaction(
      hexstring: string, options: BitcoinCore.FundRawTxOptions
    ): Promise<{ hex: string; fee: number; changepos: number }>;

    generate(nblocks: number, maxtries?: number): Promise<string[]>;

    generateToAddress(nblock: number, address: string, maxtries?: number): Promise<string[]>;

    /**
     * @deprecated
     * @param {string} address
     * @returns {Promise<string>}
     */
    getAccount(address: string): Promise<string>;

    /**
     * @deprecated
     * @param {string} account
     * @returns {Promise<string>}
     */
    getAccountAddress(account: string): Promise<string>;

    getAddedNodeInfo(node?: string): Promise<BitcoinCore.AddedNodeInfo[]>;

    /**
     * @deprecated
     * @param {string} account
     * @returns {Promise<string[]>}
     */
    getAddressesByAccount(account: string): Promise<string[]>;

    getBalance(account?: string, minconf?: number, include_watchonly?: boolean): Promise<number>;

    getBestBlockHash(): Promise<string>;

    getBlock(blockhash: string, verbosity?: number): Promise<string | BitcoinCore.Block>;

    getBlockByHash(hash: string, extension: BitcoinCore.RestExtension): Promise<BitcoinCore.Block>;

    getBlockCount(): Promise<number>;

    getBlockHash(height: number): Promise<string>;

    getBlockHeader(hash: string, verbose?: boolean): Promise<string | BitcoinCore.BlockHeader>;

    getBlockHeadersByHash(hash: string, extension: BitcoinCore.RestExtension): Promise<BitcoinCore.BlockHeader[]>;

    getBlockTemplate(...args: any[]): void;

    getBlockchainInfo(): Promise<BitcoinCore.ChainInfo>;

    getBlockchainInformation(): Promise<BitcoinCore.ChainInfo>;

    getChainTips(): Promise<BitcoinCore.ChainTip[]>;

    getChainTxStats(nblocks?: number, blockchash?: string): Promise<BitcoinCore.TxStats>;

    getConnectionCount(): Promise<number>;

    getDifficulty(): Promise<number>;

    /**
     * @deprecated
     */
    getGenerate(...args: any[]): void;

    /**
     * @deprecated
     */
    getHashesPerSec(...args: any[]): void;

    /**
     * @deprecated
     */
    getInfo(...args: any[]): void;

    getMemoryInfo(mode?: "stats" | "mallocinfo"): Promise<BitcoinCore.MemoryStats | string>;

    getMemoryPoolContent(): Promise<BitcoinCore.MempoolContent>;

    getMemoryPoolInformation(): Promise<BitcoinCore.MempoolInfo>;

    getMempoolAncestors(txid: string, verbose?: boolean): Promise<BitcoinCore.MempoolContent[] | string[] | null[]>;

    getMempoolDescendants(txid: string, verbose?: boolean): Promise<BitcoinCore.MempoolContent[] | string[] | null[]>;

    getMempoolEntry(txid: string): Promise<BitcoinCore.MempoolContent>;

    getMempoolInfo(): Promise<BitcoinCore.MempoolInfo>;

    getMiningInfo(): Promise<BitcoinCore.MiningInfo>;

    getNetTotals(): Promise<BitcoinCore.NetTotals>;

    getNetworkHashPs(nblocks?: number, height?: number): Promise<number>;

    getNetworkInfo(): Promise<BitcoinCore.NetworkInfo>;

    getNewAddress(account?: string): Promise<string>;

    getPeerInfo(): Promise<BitcoinCore.PeerInfo[]>;

    getRawChangeAddress(): Promise<string>;

    getRawMempool(verbose?: boolean): Promise<BitcoinCore.MempoolContent[] | string[] | null[]>;

    getRawTransaction(txid: string, verbose?: boolean): Promise<BitcoinCore.FetchedRawTransaction | string>;

    /**
     * @deprecated
     * @param {string} account
     * @param {number} minconf
     * @returns {Promise<number>}
     */
    getReceivedByAccount(account: string, minconf?: number): Promise<number>;

    getReceivedByAddress(address: string, minconf?: number): Promise<number>;

    getTransaction(txid: string, include_watchonly?: boolean): Promise<BitcoinCore.WalletTransaction>;

    getTransactionByHash(hash: string, extension?: BitcoinCore.RestExtension): Promise<string>;

    getTxOut(txid: string, index: number, include_mempool?: boolean): Promise<BitcoinCore.TxOutInBlock>;

    getTxOutProof(txids: string[], blockchash?: string): Promise<string>;

    getTxOutSetInfo(): Promise<BitcoinCore.UTXOStats>;

    getUnconfirmedBalance(): Promise<number>;

    getUnspentTransactionOutputs(outpoints: BitcoinCore.Outpoint[]):
    Promise<{ chainHeight: number; chaintipHash: string; bipmap: string; utxos: BitcoinCore.UTXO[] }>;

    getWalletInfo(): Promise<BitcoinCore.WalletInfo>;

    /**
     * @deprecated
     */
    getWork(...args: any[]): void;

    help(arg: void | BitcoinCore.MethodNameInLowerCase): Promise<string>;

    importAddress(script: string, label?: string, rescan?: boolean, p2sh?: boolean): Promise<void>;

    importMulti(
      requests: BitcoinCore.ImportMultiRequest[], options?: { rescan?: boolean }
    ): Promise<{ success: boolean; error?: { code: string; message: string } }[]>;

    importPrivKey(bitcoinprivkey: string, label?: string, rescan?: boolean): Promise<void>;

    importPrunedFunds(rawtransaction: string, txoutproof: string): Promise<void>;

    importPubKey(pubkey: string, label?: string, rescan?: boolean): Promise<void>;

    importWallet(filename: string): Promise<void>;

    keypoolRefill(newsize?: number): Promise<void>;

    listAccounts(minconf?: number, include_watchonlly?: boolean): Promise<{ [key: string]: number }>;

    listAddressGroupings(): Promise<BitcoinCore.AddressGrouping[][]>;

    listBanned(): Promise<any>;

    listLockUnspent(): Promise<{ txid: string; vout: number }[]>;

    listReceivedByAccount(minconf?: number, include_empty?: boolean, include_watchonly?: boolean):
    Promise<BitcoinCore.ReceivedByAccount[]>;

    listReceivedByAddress(minconf?: number, include_empty?: boolean, include_watchonly?: boolean):
    Promise<BitcoinCore.ReceivedByAddress[]>;

    listSinceBlock(blockhash?: string,
      target_confirmations?: number,
      include_watchonly?: boolean,
      include_removed?: boolean): Promise<BitcoinCore.ListSinceBlockResult>;

    listTransactions(account?: string,
      count?: number,
      skip?: number,
      include_watchonly?: boolean): Promise<BitcoinCore.ListTransactionsResult[]>;

    listUnspent(minconf?: number,
      maxconf?: number,
      address?: string[],
      include_unsafe?: boolean,
      query_options?: BitcoinCore.ListUnspentOptions): Promise<BitcoinCore.UnspentTxInfo[]>

    listWallets(): Promise<string[]>;

    lockUnspent(unlock: boolean, transactions?: { txid: string; vout: number }[]): Promise<boolean>;

    /**
     * @deprecated
     * @param {string} fromaccout
     * @param {string} toaccount
     * @param {number} amount
     * @param {number} dummy
     * @param {string} comment
     * @returns {Promise<boolean>}
     */
    move(fromaccout: string, toaccount: string, amount: number, dummy?: number, comment?: string): Promise<boolean>;

    ping(): Promise<void>;

    preciousBlock(blockhash: string): Promise<void>;

    prioritiseTransaction(txid: string, dummy: 0, fee_delta: number): Promise<boolean>;

    pruneBlockchain(height: number): Promise<number>;

    removePrunedFunds(txid: string): Promise<void>;

    /**
     * @deprecated
     * @param {string} fromaccount
     * @param {string} toaddress
     * @param {number | string} amount
     * @param {number} minconf
     * @param {string} comment
     * @param {string} comment_to
     * @returns {Promise<string>}
     */
    sendFrom(fromaccount: string,
      toaddress: string,
      amount: number | string,
      minconf?: number,
      comment?: string,
      comment_to?: string): Promise<string>;

    sendMany(fromaccount: string,
      amounts: { address: string },
      minconf?: number,
      comment?: string,
      subtractfeefrom?: string[],
      replaeable?: boolean,
      conf_target?: number,
      estimate_mode?: BitcoinCore.FeeEstimateMode): Promise<string>;

    sendRawTransaction(hexstring: string, allowhighfees?: boolean): Promise<void>;

    sendToAddress(address: string,
      amount: number,
      comment?: string,
      comment_to?: string,
      subtreactfeefromamount?: boolean,
      replaceable?: boolean,
      conf_target?: number,
      estimate_mode?: BitcoinCore.FeeEstimateMode): Promise<string>;

    /**
     * @deprecated
     * @param {string} address
     * @param {string} account
     * @returns {Promise<void>}
     */
    setAccount(address: string, account: string): Promise<void>;

    setBan(subnet: string, command: "add" | "remove", bantime?: number, absolute?: boolean): Promise<void>;

    /**
     * @deprecated
     * @param args
     */
    setGenerate(...args: any[]): void;

    setNetworkActive(state: boolean): Promise<void>;

    setTxFee(amount: number | string): Promise<boolean>;

    signMessage(address: string, message: string): Promise<string>;

    signMessageWithPrivKey(privkey: string, message: string): Promise<{ signature: string }>;

    signRawTransaction(
      hexstring: string, prevtxs?: BitcoinCore.PrevOut[], privkeys?: string[], sighashtype?: BitcoinCore.SigHashType
    ): Promise<BitcoinCore.SignRawTxResult>;

    stop(): Promise<void>;

    submitBlock(hexdata: string, dummy?: any): Promise<void>;

    upTime(): Promise<number>;

    validateAddress(address: string): Promise<BitcoinCore.ValidateAddressResult>;

    verifyChain(checklevel?: number, nblocks?: number): Promise<boolean>;

    verifyMessage(address: string, signature: string, message: string): Promise<boolean>;

    verifyTxOutProof(proof: string): Promise<string[]>;

    walletLock(passphrase: string, timeout: number): Promise<void>;

    walletPassphrase(passphrase: string, timeout: number): Promise<void>;

    walletPassphraseChange(oldpassphrase: string, newpassphrase: string): Promise<string>;
  }
}

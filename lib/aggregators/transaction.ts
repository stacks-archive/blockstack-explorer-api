import { AggregatorWithArgs } from './aggregator';
import { HistoryRecordData, getHistoryFromTxid } from '../core-db-pg/queries';
import { btcValue, stacksValue } from '../utils';
import { DecodeTxResult, decodeTx } from '../btc-tx-decoder';
import { StacksDecodeResult, decode as decodeStx } from '../stacks-decoder';
import { GetStxAddressResult, getStxAddresses } from '../../controllers/v2-controller';
import { getTX, getLatestBlockHeight } from '../bitcore-db/queries';
import { fetchRawTxInfo } from '../client/core-api';
import { Transaction } from 'bitcoinjs-lib';
import { HistoryDataTokenTransfer } from '../core-db-pg/history-data-types';


export type TransactionAggregatorOpts = {
  hash: string;
};

export type TransactionAggregatorResult = DecodeTxResult & {
  feeBTC: string;
  confirmations: number;
} & Partial<GetStxAddressResult & HistoryRecordData & {
  memo: string;
  stxDecoded: StacksDecodeResult;
  valueStacks: string;
  valueStacksFormatted: string;
}>;


class TransactionAggregator extends AggregatorWithArgs<TransactionAggregatorResult, TransactionAggregatorOpts> {

  key(args: TransactionAggregatorOpts) {
    return `Transaction:${args.hash}`;
  }

  expiry() {
    return 10 * 60; // 10 minutes
  }

  async setter({ hash }: TransactionAggregatorOpts) {
    const [tx, rawTx, latestBlockHeight, history] = await Promise.all([
      getTX(hash),
      // TODO: refactor to use bitcore
      fetchRawTxInfo(hash),
      getLatestBlockHeight(),
      getHistoryFromTxid(hash)
    ]);
    const decodedTx = Transaction.fromHex(rawTx);
    const formattedTX = await decodeTx(decodedTx, tx);
    const txData = {
      ...formattedTX,
      feeBTC: btcValue(formattedTX.fee),
      confirmations: latestBlockHeight - tx.blockHeight
    };
    if (history && history.opcode === 'TOKEN_TRANSFER') {
      const tokenTransferHistory = history.historyData as HistoryDataTokenTransfer;
      const stxAddresses = getStxAddresses(history);
      const stxDecoded = decodeStx(rawTx);
      const valueStacks = stacksValue(
        parseInt(tokenTransferHistory.token_fee, 10)
      );
      return {
        ...txData,
        ...stxAddresses,
        ...history,
        memo: tokenTransferHistory.scratch_area
          ? Buffer.from(tokenTransferHistory.scratch_area, 'hex').toString()
          : null,
        stxDecoded,
        valueStacks,
        valueStacksFormatted: stacksValue(tokenTransferHistory.token_fee, true)
      };
    } else {
      return txData;
    }
  }
}

const transactionAggregator = new TransactionAggregator();

export default transactionAggregator;

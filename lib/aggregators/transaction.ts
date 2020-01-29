import { AggregatorWithArgs } from './aggregator';
import { HistoryRecordData, getHistoryFromTxid } from '../core-db-pg/queries';
import { btcValue, stacksValue } from '../utils';
import { DecodeTxResult, decodeTx } from '../btc-tx-decoder';
import { getStxAddresses } from '../../controllers/v2-controller';
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
} & Partial<HistoryRecordData & {
  senderSTX: string;
  recipientSTX: string;
  memo: string;
  /** Total Stacks transferred */
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

  async setter({ hash }: TransactionAggregatorOpts): Promise<TransactionAggregatorResult> {
    const [tx, rawTx, latestBlockHeight, history] = await Promise.all([
      getTX(hash),
      // TODO: refactor to use bitcore/pg
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
      const historyData = history.historyData as HistoryDataTokenTransfer;
      const stxAddresses = getStxAddresses(history);
      const valueStacks = stacksValue(historyData.token_fee);
      return {
        ...txData,
        ...stxAddresses,
        ...history,
        memo: historyData.scratch_area
          ? Buffer.from(historyData.scratch_area, 'hex').toString()
          : null,
        valueStacks,
        valueStacksFormatted: stacksValue(historyData.token_fee, true)
      };
    } else {
      return txData;
    }
  }
}

const transactionAggregator = new TransactionAggregator();

export default transactionAggregator;

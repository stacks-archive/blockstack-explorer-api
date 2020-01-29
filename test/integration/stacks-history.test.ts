import '../setup';
import * as BluebirdPromise from 'bluebird';
import { flatten } from 'lodash';
import StacksAddress from '../../lib/aggregators/stacks-address';
import { network } from '../../lib/client/core-api';
import BN = require('bn.js');

interface CoreHistoryItem {
  txid: string;
  vtxindex: number;
  block_id: number;
  address: string;
  credit_value: BN;
  debit_value: BN;
  lock_transfer_block_id: number;
  type: string;
}

const testAddressHistory = async (addr: string) => {
  const pages = [0, 1, 2, 3, 4];
  const historyPages = await BluebirdPromise.map(pages, async (page: number) => {
    const pageRecord: CoreHistoryItem[] = await network.getAccountHistoryPage(addr, page);
    return pageRecord;
  });
  const pages2 = [0, 1, 2];
  const history: CoreHistoryItem[] = flatten(historyPages);
  const stacksAddressHistoryPages = await BluebirdPromise.mapSeries(pages2, async (page: number) => {
    const stacksAddress = await StacksAddress.setter({addr, page});
    return stacksAddress.history;
  });
  const stacksAddressHistory = flatten(stacksAddressHistoryPages);
  
  let currentIndex = 0;
  const firstBlock = stacksAddressHistory[0].block_id;
  const lastBlock = stacksAddressHistory[stacksAddressHistory.length - 1].block_id;
  const blockCheckCount = Math.min(stacksAddressHistory.length, history.length);
  for (let i = 0; i < blockCheckCount; i++) {
    const coreHistory = history[i];
    if (coreHistory.vtxindex !== 0 && coreHistory.block_id <= firstBlock && coreHistory.block_id >= lastBlock) {
      const stacksHistory = stacksAddressHistory[currentIndex];
      expect(stacksHistory.txid).toEqual(coreHistory.txid);
      currentIndex += 1;
    }
  };
};

test('history matches for an address with token grants', async () => {
  const addr = 'SP1ERE1Z1MDVM100NWYR16GZZJJTZQYHG4F6GWBDM';
  await testAddressHistory(addr);
}, 15000);

test('history matches for an address with lots of activity', async () => {
  const addr = 'SP3VJDN79TRQ3KX8PCV4J5ZSYX1JRTVA937SYKY1S';
  await testAddressHistory(addr);
}, 15000);

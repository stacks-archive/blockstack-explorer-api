import '../setup';
import BluebirdPromise from 'bluebird';
import flatten from 'lodash/flatten';
import StacksAddress from '../../lib/aggregators/stacks-address';
import { network } from '../../lib/client/core-api';

interface CoreHistoryItem {
  txid: string
  vtxindex: number
  block_id: number
}

const testAddressHistory = async (addr: string) => {
  const pages = [0, 1, 2, 3, 4];
  const historyPages = await BluebirdPromise.map(pages, async (page) => {
    const pageRecord = await network.getAccountHistoryPage(addr, page);
    return pageRecord;
  });
  const history: CoreHistoryItem[] = flatten(historyPages);
  const stacksAddress = await StacksAddress.setter(addr);
  let currentIndex = 0;
  const firstBlock = stacksAddress.history[0].block_id;
  const lastBlock = stacksAddress.history[stacksAddress.history.length - 1].block_id;
  history.forEach((coreHistory) => {
    if (coreHistory.vtxindex !== 0 && coreHistory.block_id <= firstBlock && coreHistory.block_id >= lastBlock) {
      const stacksHistory = stacksAddress.history[currentIndex];
      expect(stacksHistory.txid).toEqual(coreHistory.txid);
      currentIndex += 1;
    }
  });
};

test('history matches for an address with token grants', async () => {
  const addr = 'SP1ERE1Z1MDVM100NWYR16GZZJJTZQYHG4F6GWBDM';
  await testAddressHistory(addr);
}, 15000);

test('history matches for an address with lots of activity', async () => {
  const addr = 'SP3VJDN79TRQ3KX8PCV4J5ZSYX1JRTVA937SYKY1S';
  await testAddressHistory(addr);
}, 15000);

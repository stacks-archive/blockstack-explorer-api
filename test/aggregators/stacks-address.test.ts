import '../setup';
import BN from 'bn.js';
import StacksAddress from '../../lib/aggregators/stacks-address';

test('can get basic STX address info', async () => {
  const account = await StacksAddress.setter('SPCFS0TX3MS91928283R36V2G14BGKSMVE3FMN93');
  expect(account.btcAddress).toEqual('13H7iXRFRTQTgLnTi4SrTK4wzdTnZcaGES');
  expect(account.address).toEqual('SPCFS0TX3MS91928283R36V2G14BGKSMVE3FMN93');
  expect(account.history.length).toBeGreaterThanOrEqual(2);
  expect(account.vestingTotal).toEqual(51145000000);
  expect(account.totalUnlocked).toBeGreaterThanOrEqual(2131041668);
  expect(account.totalLocked).toBeLessThanOrEqual(49013958332);
  expect(account.totalLocked + account.totalUnlocked).toEqual(account.vestingTotal);
  const txid = '2e9fae03a2dc74611506433312d8f8ca7f723dcf0de9e7b0230ce72940fbc2a2';
  const historyItem = account.history.find(h => h.txid === txid);
  if (!historyItem) {
    throw new Error('TX not found for stacks address');
  }
  expect(historyItem.txid).toBeTruthy();
  expect(historyItem.opcode).toBeTruthy();
  expect(historyItem.valueStacks).toBeGreaterThan(0);
  expect(historyItem.opcode).toEqual('TOKEN_TRANSFER');
  expect(historyItem.block_id).toEqual(600459);
  expect(historyItem.sender).toEqual('SP1JCYM6PW38TWMYPTMATJWSQ089WAQRZ78Z430PB');
  expect(historyItem.recipient).toEqual('SPCFS0TX3MS91928283R36V2G14BGKSMVE3FMN93');
  expect(historyItem.operation).toEqual('RECEIVED');
  expect(historyItem.valueStacks).toEqual(8649);
  expect(historyItem.blockTime).toEqual(1571710607000);
});

test('only fetches 50 most recent transactions', async () => {
  const address = 'SP1P72Z3704VMT3DMHPP2CB8TGQWGDBHD3RPR9GZS';
  const account = await StacksAddress.setter(address);
  expect(account.history.length).toEqual(50);
});

test('calculates token grants', async () => {
  const address = 'SP1ERE1Z1MDVM100NWYR16GZZJJTZQYHG4F6GWBDM';
  const account = await StacksAddress.setter(address);
  expect(account.tokensGranted).toEqual(5245000000);
});

test('should include token vesting schedule for 2019 accounts', async () => {
  const address = 'SPCFS0TX3MS91928283R36V2G14BGKSMVE3FMN93';
  const account = await StacksAddress.setter(address);
  const vesting = {
    1572082015000: 2131041668,
    1574674015000: 4262083336,
    1577266015000: 6393125004,
    1579858015000: 8524166671,
    1582450015000: 10655208338,
    1585042015000: 12786250005,
    1587634015000: 14917291672,
    1590226015000: 17048333339,
    1592818015000: 19179375006,
    1595410015000: 21310416673,
    1598002015000: 23441458340,
    1600594015000: 25572500007,
    1603186015000: 27703541674,
    1605778015000: 29834583340,
    1608370015000: 31965625006,
    1610962015000: 34096666672,
    1613554015000: 36227708338,
    1616146015000: 38358750004,
    1618738015000: 40489791670,
    1621330015000: 42620833336,
    1623922015000: 44751875002,
    1626514015000: 46882916668,
    1629106015000: 49013958334,
    1631698015000: 51145000000,
  };
  expect(account.cumulativeVestedAtBlocks).toEqual(vesting);
});

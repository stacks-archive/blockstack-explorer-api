import '../setup';
import StacksAddress from '../../lib/aggregators/stacks-address';

test('can get basic STX address info', async () => {
  const account = await StacksAddress.setter('SPCFS0TX3MS91928283R36V2G14BGKSMVE3FMN93');
  expect(account.totalUnlocked).toEqual(0);
  expect(account.totalUnlockedStacks).toEqual(0);
  expect(account.btcAddress).toEqual('13H7iXRFRTQTgLnTi4SrTK4wzdTnZcaGES');
  expect(account.address).toEqual('SPCFS0TX3MS91928283R36V2G14BGKSMVE3FMN93');
  expect(account.history.length).toBeGreaterThanOrEqual(2);
  const historyItem = account.history.find(h => h.txid === '2e9fae03a2dc74611506433312d8f8ca7f723dcf0de9e7b0230ce72940fbc2a2');
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

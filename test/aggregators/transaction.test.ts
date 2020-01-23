import '../setup';
import TransactionAggregator from '../../lib/aggregators/transaction';

test('fetches a TX', async () => {
  const tx = await TransactionAggregator.setter({hash:
    'b5eec33c42920752d60203eae6b1a9bddab18f1f88ba9999352b93589d70e530'
  });
  expect(tx.blockheight).toBe(517739);
  expect(tx.vout[0].scriptPubKey.hex).toBe(
    // eslint-disable-next-line max-len
    '6a3c69643a68616e6b73746f657665722e69640000000000000000000000000000000000000000000000daa4437cd303d5c751b62a4c25ece524889b0b81'
  );
  expect(tx.vin[0].addr).toBe('17kuBnomGz2mU5A5eKiA3a5MuadHUybWbC');
  expect(tx.value).toEqual(0.0027731);
  expect(tx.valueOut).toEqual(0.0027731);
});

test('fetches an older TX', async () => {
  const tx = await TransactionAggregator.setter({hash:
    '7e08c36aaa53ae3fc87abfda55a6cd92de7dd723da3399ad274b614cb7d37874'
  });
  expect(tx.blockheight).toBe(332624);
  expect(tx.vout[0].scriptPubKey.hex).toBe(
    '76a9146b4b10e85549c2faee992947299f1058a771e97488ac'
  );
  expect(tx.vin[0].addr).toBe('15yxQGynajqqEQiGBoioe6ATp2n2LTBJ4V');
  expect(tx.value).toEqual(4.29555498);
  expect(tx.valueOut).toEqual(4.29555498);
}, 25000);

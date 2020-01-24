import * as btc from 'bitcoinjs-lib';
import * as c32check from 'c32check';

/**
 * @param addr Bitcoin address
 */
export const getSTXAddress = (addr: string): string => {
  const result = c32check.b58ToC32(
    btc.address.fromOutputScript(Buffer.from(addr, 'hex'), btc.networks.bitcoin)
  );
  return result;
}

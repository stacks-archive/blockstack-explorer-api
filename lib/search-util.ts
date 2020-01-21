import * as bitcoinjs from 'bitcoinjs-lib';
import * as c32check from 'c32check';

function getBlockchainNetworkMode() {
  if (process.env.BLOCKCHAIN_REGTEST) {
    return 'regtest';
  }
  if (process.env.BLOCKCHAIN_TESTNET) {
    return 'testnet';
  }
  return 'mainnet';
}

function getBitcoinNetwork() {
  const networkConfig = getBlockchainNetworkMode();
  switch (networkConfig) {
  case 'testnet':
    return bitcoinjs.networks.testnet;
  case 'regtest':
    return bitcoinjs.networks.regtest;
  default:
    return bitcoinjs.networks.bitcoin;
  }
}

/**
 * Checks if a string is a valid Bitcoin address.
 * Returns `false` if invalid, otherwise returns the normalized address.
 * @param address - Bitcoin address.
 */
export function isValidBtcAddress(address: string) {
  try {
    const btcNetwork = getBitcoinNetwork();
    const addressOutput = bitcoinjs.address.toOutputScript(address, btcNetwork);
    const normalized = bitcoinjs.address.fromOutputScript(addressOutput, btcNetwork);
    return normalized;
  } catch (error) {
    return false;
  }
}

/**
 * Checks if a string is a valid Blockstack name / subdomain.
 * Returns `false` if invalid, otherwise returns the normalized name.
 * @param name - Blockstack ID name.
 */
export function isValidBlockstackName(name: string) {
  const nameFormat = /^([A-Za-z0-9_]+\.){1,2}[A-Za-z0-9_]+$/;
  if (typeof name === 'string' && nameFormat.test(name)) {
    return name.toLowerCase();
  }
  return false;
}

/**
 * Checks if a string is a valid Bitcoin address.
 * Returns `false` if invalid, otherwise returns the normalized address.
 * @param address - Bitcoin address.
 */
export function isValidStxAddress(address: string) {
  try {
    const b85 = c32check.c32ToB58(address);
    const normalized = c32check.b58ToC32(b85);
    return normalized;
  } catch (error) {
    return false;
  }
}

/**
 * Checks if a string is a valid Sha256 hash.
 * Returns `false` if invalid, otherwise returns the normalized hash.
 * @param hash - Hex encoded string.
 */
export function isValidSha256Hash(hash: string) {
  if (typeof hash !== 'string') {
    return false;
  }
  let lower = hash.toLowerCase();
  if (lower.startsWith('0x')) {
    lower = lower.substr(2);
  }
  if (lower.length !== 64) {
    return false;
  }
  try {
    const buff = Buffer.from(lower, 'hex');
    if (buff.length === 32) {
      const normalized = buff.toString('hex');
      return normalized;
    }
  } catch (error) {
    // invalid hex string
  }
  return false;
}

/**
 * Checks if a string can be an integer of valid Bitcoin block height.
 * A block height that would be over ~100 years in the future is considered invalid.
 * Returns `false` if invalid, otherwise returns the normalized integer as a string.
 * @param height - Bitcoin block number
 */
export function isValidBtcBlockHeight(height: string) {
  const number = parseInt(height, 10);
  if (number.toString() !== height) {
    return false;
  }
  if (!Number.isInteger(number) || number < 0 || number > 5000000) {
    return false;
  }
  return number.toString();
}

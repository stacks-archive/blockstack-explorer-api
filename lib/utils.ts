/* eslint-disable prefer-destructuring */
import moment from 'moment';
import accounting from 'accounting';
import BigNumber from 'bignumber.js';

export const stacksValue = (value: number) =>
  +`${Math.round(parseFloat(`${value * 10e-7}e+7`))}e-7`;
export const btcValue = (value: number) =>
  +`${Math.round(parseFloat(`${value * 10e-9}e+9`))}e-9`;

export const formatNumber = (value: number) => {
  const formatted = accounting.formatNumber(value, 8);
  const decimals = formatted.split('.')[1];
  let precision = 8;
  decimals
    .split('')
    .reverse()
    .some(char => {
      if (char === '0') {
        precision -= 1;
      }
      return char !== '0';
    });
  return accounting.formatNumber(value, precision);
};

const startBlock = 538161;
const start = moment(1535059015 * 1000);

export const blockToTime = (block: number) => {
  // 10 minutes per block
  const blocksSinceTimestamp = block - startBlock;
  const minutes = blocksSinceTimestamp * 10;
  const time = moment(start).add(minutes, 'minutes');
  return time.valueOf();
};

export const extractHostname = (url: string) => {
  let hostname: string;
  // find & remove protocol (http, ftp, etc.) and get hostname

  if (url.includes('//')) {
    hostname = url.split('/')[2];
  } else {
    hostname = url.split('/')[0];
  }

  // find & remove port number
  hostname = hostname.split(':')[0];
  // find & remove "?"
  hostname = hostname.split('?')[0];

  return hostname;
};

/**
 * Get root domain of a string (URL)
 * @param {string} url - the url you want the domain of
 */
export const extractRootDomain = (url: string) => {
  let domain = extractHostname(url);
  const splitArr = domain.split('.');
  const arrLen = splitArr.length;

  // extracting the root domain here
  // if there is a subdomain
  if (arrLen > 2) {
    domain = `${splitArr[arrLen - 2]}.${splitArr[arrLen - 1]}`;
    // check to see if it's using a Country Code Top Level Domain (ccTLD) (i.e. ".me.uk")
    if (
      splitArr[arrLen - 2].length === 2 &&
      splitArr[arrLen - 1].length === 2
    ) {
      // this is using a ccTLD
      domain = `${splitArr[arrLen - 3]}.${domain}`;
    }
  }
  return domain;
};

export const TOTAL_STACKS = '1320000000';
export const MICROSTACKS_IN_STACKS = 1000000;
export const STACKS_DECIMAL_PLACES = 6;

const MAX_BIGNUMBER_ROUND_MODE = 8;
type StacksFormat = 'string' | 'thousands' | 'bigint';

/**
 * Converts integer microstacks to full stacks. E.g. `"1"` to `"0.000001"`.
 * String return values are unrounded fixed-point decimals (six decimal places).
 */
function microStacksToStacks(microStx: BigNumber | string, format?: 'thousands' | 'string'): string;
function microStacksToStacks(microStx: BigNumber | string, format: 'bigint'): BigNumber;
function microStacksToStacks(microStx: BigNumber | string, format: StacksFormat | undefined): string | BigNumber {
  const input = typeof microStx === 'string' ? new BigNumber(microStx) : microStx;
  const stxValue = input.dividedBy(MICROSTACKS_IN_STACKS);
  let result: string | BigNumber;
  if (format === undefined || format === 'string') {
    result = stxValue.toFixed(STACKS_DECIMAL_PLACES, MAX_BIGNUMBER_ROUND_MODE);
  } else if (format === 'thousands') {
    result = stxValue.toFormat(STACKS_DECIMAL_PLACES, MAX_BIGNUMBER_ROUND_MODE);
  } else if (format === 'bigint') {
    result = stxValue;
  } else {
    throw new Error(`Unexpected Stacks value rounding mode "${format}"`);
  }
  return result;
}

export { microStacksToStacks };

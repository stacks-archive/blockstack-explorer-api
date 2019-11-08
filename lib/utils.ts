/* eslint-disable prefer-destructuring */
import moment from 'moment';
import accounting from 'accounting';

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

module.exports = {
  stacksValue,
  blockToTime,
  formatNumber,
  btcValue,
  extractHostname,
  extractRootDomain
};

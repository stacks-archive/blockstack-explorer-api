const moment = require('moment');

const stacksValue = value => +`${Math.round(`${value * 10e-7}e+7`)}e-7`;
const btcValue = value => +`${Math.round(`${value * 10e-9}e+9`)}e-9`;

const startBlock = 538161;
const start = moment(1535059015 * 1000);

const blockToTime = (block) => {
  // 10 minutes per block
  const blocksSinceTimestamp = block - startBlock;
  const minutes = blocksSinceTimestamp * 10;
  const time = moment(start).add(minutes, 'minutes');
  return time.valueOf();
};

module.exports = {
  stacksValue,
  blockToTime,
  btcValue,
};

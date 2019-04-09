const stacksValue = value => +`${Math.round(`${value * 10e-7}e+7`)}e-7`;

module.exports = {
  stacksValue,
};

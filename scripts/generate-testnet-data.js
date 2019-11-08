const util = require('util');
const exec = util.promisify(require('child_process').exec);
const request = require('request-promise');

const gaiaRead = 'http://testnet.blockstack.org:4000';
const subdomainRegistrar = 'http://testnet.blockstack.org:30000';

const execute = async cmd => {
  const path = 'node /Users/hank/blockstack/cli-blockstack/lib/index.js -t';
  return exec(`${path} ${cmd}`);
};

const makeAccount = async () => {
  const { stdout } = await execute('make_keychain');
  const account = JSON.parse(stdout);
  return account;
};

const useFaucet = async address => {
  const uri = 'https://testnet.blockstack.org/sendStacks';
  const opts = {
    uri,
    method: 'POST',
    form: {
      addr: address,
      value: 500000000
    },
    followAllRedirects: true,
    transform: (body, response) => response.req.path.split('=')[1]
  };
  const txId = await request(opts);
  // console.log(txId);
  return txId;
};

const getConfirms = async tx => {
  const { stdout } = await execute(`get_confirmations ${tx}`);
  const { confirmations } = JSON.parse(stdout);
  console.log('Confirmations:', confirmations);
  return confirmations;
};

const getBalance = async address => {
  const { stdout } = await execute(`balance ${address}`);
  return JSON.parse(stdout);
};

const registerName = async (account, name) => {
  const ownerKey = account.ownerKeyInfo.privateKey;
  const payKey = account.paymentKeyInfo.privateKey;
  const { stdout } = await execute(
    `register ${name}.id2 ${ownerKey} ${payKey} ${gaiaRead}`
  );
  return JSON.parse(stdout);
};

const registerSubdomain = async (account, name) => {
  const ownerKey = account.ownerKeyInfo.privateKey;
  const { stdout } = await execute(
    `register_subdomain ${name}.personal.id2 ${ownerKey} "${gaiaRead}" "${subdomainRegistrar}"`
  );
  console.log(stdout);
  return JSON.parse(stdout);
};

const sendTokens = async (from, to, amount, memo) => {
  const address = to.paymentKeyInfo.address.STACKS;
  const payKey = from.paymentKeyInfo.privateKey;
  const cmd = `send_tokens ${address} STACKS ${amount} ${payKey} "${memo}"`;
  console.log(cmd);
  const { stdout } = await execute(cmd);
  // console.log(stdout);
  return stdout;
  // return JSON.parse(stdout);
};

const run = async () => {
  const account = await makeAccount();
  const address = account.paymentKeyInfo.address.STACKS;
  console.log(address);
  const tx = await useFaucet(address);
  let confirms = await getConfirms(tx);
  while (confirms < 1) {
    confirms = await getConfirms(tx); // eslint-disable-line
  }
  const balance = await getBalance(address);
  console.log(balance);

  const otherAccount = await makeAccount();
  // const otherAddress = otherAccount.paymentKeyInfo.address.STACKS;

  console.log('Sending tokens...');
  const paymentTx = await sendTokens(
    account,
    otherAccount,
    125000,
    'For testing!'
  );
  console.log(paymentTx);

  console.log('Registering a name...');
  const name = await registerName(account, `hank-${new Date().getTime()}`);
  console.log(`Registered ${name}`);
};

run()
  .catch(e => {
    console.error(e);
    process.exit();
  })
  .then(() => {
    console.log('done!');
    process.exit();
  });

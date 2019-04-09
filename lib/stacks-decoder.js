const btc = require('bitcoinjs-lib');
const bigi = require('bigi');
// const BigInteger = require('bigi/lib/bigi');
const c32check = require('c32check');

const decode = (rawTX) => {
  const tx = btc.Transaction.fromHex(rawTX);
  const data = btc.script.decompile(tx.outs[0].script)[1];

  const operationType = data.slice(2, 3).toString(); // should be == '$' for token transfers.
  const consensusHash = data.slice(3, 19).toString('hex');

  const tokenTypeHex = data.slice(19, 38).toString('hex');
  const tokenTypeStart = tokenTypeHex.search(/[1-9]/);
  // should be == 'STACKS'
  const tokenType = Buffer.from(tokenTypeHex.slice(tokenTypeStart - (tokenTypeStart % 2)), 'hex').toString();

  const tokenSentHex = data.slice(38, 46).toString('hex');
  const tokenSentBigI = bigi.fromHex(tokenSentHex);

  const scratchData = data.slice(46, 80).toString();

  const recipientBitcoinAddress = btc.address.fromOutputScript(tx.outs[1].script, btc.networks.bitcoin);
  const recipientC32Address = c32check.b58ToC32(recipientBitcoinAddress);

  const inputData = btc.script.decompile(tx.ins[0].script);
  const hash = btc.crypto.hash160(inputData[inputData.length - 1]);
  const isPubKey = btc.script.isCanonicalPubKey(inputData[inputData.length - 1]);
  const version = isPubKey ? btc.networks.bitcoin.pubKeyHash : btc.networks.bitcoin.scriptHash;
  const senderBitcoinAddress = btc.address.toBase58Check(hash, version);
  const senderC32Address = c32check.b58ToC32(senderBitcoinAddress);

  // console.log(tx.ins[0]);

  // const feesValue = tx.ins.reduce((sum, input) => {
  //   console.log(input.value);
  // }, 0);

  return {
    operationType,
    consensusHash,
    tokenType,
    tokensSent: tokenSentBigI.toString(),
    scratchData,
    recipientBitcoinAddress,
    recipient: recipientC32Address,
    tokenSentHex,
    senderBitcoinAddress,
    sender: senderC32Address,
    // feesValue,
  };
};

module.exports = {
  decode,
};

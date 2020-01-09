import btc from 'bitcoinjs-lib';
import bigi from 'bigi';
import c32check from 'c32check';

export const decode = rawTX => {
  const tx = btc.Transaction.fromHex(rawTX);
  const data = btc.script.decompile(tx.outs[0].script)[1];
  if (!Buffer.isBuffer(data)) {
    throw new Error(`Unexpected tx.outs[0].script type ${data}`);
  }

  const operationType = data.slice(2, 3).toString(); // should be == '$' for token transfers.
  const consensusHash = data.slice(3, 19).toString('hex');

  const tokenTypeHex = data.slice(19, 38).toString('hex');
  const tokenTypeStart = tokenTypeHex.search(/[1-9]/);
  // should be == 'STACKS'
  const tokenType = Buffer.from(
    tokenTypeHex.slice(tokenTypeStart - (tokenTypeStart % 2)),
    'hex'
  ).toString();

  const tokenSentHex = data.slice(38, 46).toString('hex');
  const tokenSentBigI = bigi.fromHex(tokenSentHex);

  const scratchData = data.slice(46, 80).toString();

  const recipientBitcoinAddress = btc.address.fromOutputScript(
    tx.outs[1].script,
    btc.networks.bitcoin
  );
  const recipientC32Address = c32check.b58ToC32(recipientBitcoinAddress);

  const inputData = btc.script.decompile(tx.ins[0].script);
  const input = inputData[inputData.length - 1];
  if (!Buffer.isBuffer(input)) {
    throw new Error(`Unexpected input type: ${input}`)
  }
  const hash = btc.crypto.hash160(input);
  const isPubKey = btc.script.isCanonicalPubKey(
    input
  );
  const version = isPubKey
    ? btc.networks.bitcoin.pubKeyHash
    : btc.networks.bitcoin.scriptHash;
  const senderBitcoinAddress = btc.address.toBase58Check(hash, version);
  const senderC32Address = c32check.b58ToC32(senderBitcoinAddress);

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
    sender: senderC32Address
  };
};

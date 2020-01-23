
export type HistoryDataTokenTransfer = {
  address: string;
  block_id: number;
  consensus_hash: string;
  op: string; // '$';
  recipient: string;
  recipient_address: string;
  scratch_area: string;
  sender: string;
  token_fee: string;
  token_units: string; // 'STACKS';
  txid: string;
  vtxindex: number;
};

export type HistoryDataNameRegistration = {
  address: string;
  block_number: number;
  consensus_hash: string | null;
  first_registered: number;
  importer: string | null;
  importer_address: string | null;
  last_creation_op: string | '?';
  last_renewed: number;
  name: string;
  namespace_block_number: number;
  op: string; // ':';
  op_fee: number;
  opcode: 'NAME_REGISTRATION';
  preorder_block_number: number;
  preorder_hash: string;
  revoked: boolean;
  sender: string;
  sender_pubkey: string;
  token_fee: string;
  txid: string;
  value_hash: string | null;
  vtxindex: number;
};

export type HistoryDataNamePreorder = {
  address: string;
  block_number: number;
  burn_address: string;
  consensus_hash: string;
  op: string; // '?';
  op_fee: number;
  opcode: 'NAME_PREORDER';
  preorder_hash: string;
  sender: string;
  sender_pubkey: string;
  token_fee: string;
  token_units: string; // 'BTC' | 'STACKS';
  txid: string;
  vtxindex: number;
};

export type HistoryDataNameUpdate = {
  address: string;
  block_number: number;
  consensus_hash: string;
  first_registered: number;
  importer: string | null;
  importer_address: string | null;
  last_creation_op: string;
  last_renewed: number;
  name: string;
  name_consensus_hash: string;
  name_hash128: string;
  namespace_block_number: number;
  namespace_id: string;
  op: string; // '+';
  op_fee: number;
  opcode: 'NAME_UPDATE';
  preorder_block_number: number;
  preorder_hash: string;
  revoked: boolean;
  sender: string;
  sender_pubkey: string;
  token_fee: string;
  txid: string;
  value_hash: string;
  vtxindex: number;
};

export type HistoryDataNameRenewal = {
  address: string;
  block_number: number;
  consensus_hash: string | null;
  first_registered: number;
  importer: string | null;
  importer_address: string | null;
  last_creation_op: string;
  last_renewed: number;
  name: string;
  name_hash128: string;
  namespace_block_number: number;
  namespace_id: string;
  op: string; // '::';
  op_fee: number;
  opcode: 'NAME_RENEWAL';
  preorder_block_number: number;
  preorder_hash: string;
  revoked: boolean;
  sender: string;
  sender_pubkey: string;
  token_fee: string;
  txid: string;
  value_hash: string;
  vtxindex: number;
};

export type HistoryDataNameImport = {
  address: string;
  block_number: number;
  consensus_hash: string | null;
  first_registered: number;
  importer: string;
  importer_address: string;
  last_creation_op: string;
  last_renewed: number;
  name: string;
  namespace_block_number: number;
  op: string; // ';';
  op_fee: number;
  opcode: 'NAME_IMPORT';
  preorder_block_number: number;
  preorder_hash: string;
  revoked: boolean;
  sender: string;
  sender_pubkey: string;
  token_fee: string;
  txid: string;
  value_hash: string;
  vtxindex: number;
};

export type HistoryDataNameTransfer = {
  address: string;
  block_number: number;
  consensus_hash: string;
  first_registered: number;
  importer: string | null;
  importer_address: string | null;
  keep_data: boolean;
  last_creation_op: string;
  last_renewed: number;
  name: string;
  name_hash128: string;
  namespace_block_number: number;
  namespace_id: string;
  op: string; // '>>';
  op_fee: number;
  opcode: 'NAME_TRANSFER';
  preorder_block_number: number;
  preorder_hash: string;
  revoked: boolean;
  sender: string;
  sender_pubkey: string | null;
  token_fee: string;
  txid: string;
  value_hash: string;
  vtxindex: number;
};

export type HistoryDataNamespaceReady = {
  address: string;
  base: number;
  block_number: number;
  buckets: string;
  coeff: number;
  lifetime: number;
  namespace_id: string;
  no_vowel_discount: number;
  nonalpha_discount: number;
  op: string; // '!';
  op_fee: number;
  opcode: 'NAMESPACE_READY';
  preorder_hash: string;
  ready_block: number;
  recipient: string;
  recipient_address: string;
  reveal_block: number;
  sender: string;
  sender_pubkey: string;
  token_fee: string;
  txid: string;
  version: number;
  vtxindex: number;
};

export type HistoryDataNamespacePreorder = {
  address: string;
  block_number: number;
  burn_address: string;
  consensus_hash: string;
  op: string; // '*';
  op_fee: number;
  opcode: 'NAMESPACE_PREORDER';
  preorder_hash: string;
  sender: string;
  sender_pubkey: string;
  token_fee: string;
  token_units: string;
  txid: string;
  vtxindex: number;
};

export type HistoryDataNamespaceReveal = {
  address: string;
  base: number;
  block_number: number;
  buckets: string;
  coeff: number;
  lifetime: number;
  namespace_id: string;
  no_vowel_discount: number;
  nonalpha_discount: number;
  op: string; // '&';
  op_fee: number;
  opcode: 'NAMESPACE_REVEAL';
  preorder_hash: string;
  ready_block: number;
  recipient: string;
  recipient_address: string;
  reveal_block: number;
  sender: string;
  sender_pubkey: string;
  token_fee: string;
  txid: string;
  version: number;
  vtxindex: number;
};

export type HistoryDataEntry = (
  | HistoryDataTokenTransfer 
  | HistoryDataNameRegistration 
  | HistoryDataNamePreorder 
  | HistoryDataNameUpdate 
  | HistoryDataNameRenewal 
  | HistoryDataNameImport 
  | HistoryDataNameTransfer 
  | HistoryDataNamespaceReady 
  | HistoryDataNamespacePreorder 
  | HistoryDataNamespaceReveal
);

export type HistoryDataNameOp = (
  | HistoryDataNameRegistration 
  | HistoryDataNamePreorder 
  | HistoryDataNameUpdate 
  | HistoryDataNameRenewal 
  | HistoryDataNameImport 
  | HistoryDataNameTransfer 
);

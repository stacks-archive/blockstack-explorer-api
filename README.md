# Blockstack Explorer API

## Why?

When querying for information related to Blockstack and the Blockstack naming system, there are a lot of places you need to fetch API information from. This might be blockstack-core, a Bitcore API, or even an RPC API.

Sometimes, to get information about something, you'll want to make multiple API requests to multiple places, and then aggregate that information.

This repository intends to be a one-stop-shop for all of these APIs, and it has support for aggregating and caching information for everything you might want. For example, to get all name operations in the past few days, you need to make quite a few API requests. First, fetch all blocks, and then fetch name operations for each block in that list. This project provides a single API that caches does that all for you, and caches the result in a sane way.

## N.B.

This is a new project, built for use in our new explorer. APIs are being added and changed frequently.

## APIs

All APIs are GET requests. All paths here must include the prefix `/api`. So to use the `name-operations`, API, the URL is [`/api/name-operations`](https://blockstack-explorer-api.herokuapp.com/api/name-operations).

#### /name-operations

Fetch all new name and subdomain registrations in the past 2 days.

#### /names/:name

Fetch information for a given BNS name.

#### /transactions/:tx_hash

Information for a Bitcoin transaction.

#### /addresses/:address

Information for an address

#### /blocks?date=YYYY-MM-DD

Fetch blocks for a given date. If no date is given, the current day is used.

#### /blocks/:block_hash_or_height

Fetch information for a block, given a hash or block height. It includes name operations and transaction information for this block. It only includes 10 transactions.

#### /accounts/:address

Fetch information about a given Stacks address that is included in the Genesis block.

#### /namespaces

Fetch all namespaces, including the number of names in that namespace.

#### /names?page=0

Fetch all names.

#### /namespaces/:namespace?page=0

Fetch all names in a namespace.

#### /name-counts

Fetch the total number of names and subdomains.

#### /stacks/addresses/:address

Fetch transaction history, balances, and status of a Stacks address.
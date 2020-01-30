# Blockstack Explorer API

## Why?

When querying for information related to Blockstack and the Blockstack naming system, there are a lot of places you need to fetch API information from. This might be blockstack-core, a Bitcore API, or even an RPC API.

Sometimes, to get information about something, you'll want to make multiple API requests to multiple places, and then aggregate that information.

This repository intends to be a one-stop-shop for all of these APIs, and it has support for aggregating and caching information for everything you might want. For example, to get all name operations in the past few days, you need to make quite a few API requests. First, fetch all blocks, and then fetch name operations for each block in that list. This project provides a single API that caches does that all for you, and caches the result in a sane way.

## Local Development

This is unlike a typical web server, as you need to have blockchain information seeded in the server's database. There are two sources of information:

1. `blockstack-core`, for Blockstack related data.
2. `bitcore`, for Bitcoin related data

Running Bitcore is an exercise left to the reader. It's tricky, and you need to have a full Bitcoind node in order to run Bitcore. If you're a Blockstack engineer, we have an internal Bitcore node that you can use. Ask a team member, and add the ENV variables `BITCORE_MONGODB_URI`, `BITCOIND_USERNAME`, `BITCOIND_PASSWORD`, `BITCOIND_HOST`, and `BITCOIND_PASSWORD` to a `.env` file in the root project directory.

A local redis instance must be running. An quick way to set this up is using the Docker command:
```
docker run --name redis -p 6379:6379 -d redis:alpine
```
And then adding the following to your `.env` file:
~~~
REDIS_URL=redis://localhost:6379/1
~~~

To fast-sync data from `blockstack-core`, we have a setup script that will get your database seeded with everything you need. It uses Docker, so you'll need that installed and running. Then, run `yarn seed` to run the steps needed to get a PostgresSQL database running. Then, add the following to your `.env` file:

~~~
PGUSER=admin
PGPASSWORD=password
PGPORT=5433
PGDATABASE=blockstack_core
~~~

The, you can run the server with `yarn nodemon`, which will automatically restart for file changes.

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

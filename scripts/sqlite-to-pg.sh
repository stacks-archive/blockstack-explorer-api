cd $HOME
docker stop postgres
docker rm postgres
docker rmi postgres:alpine
docker stop pgloader
docker rm pgloader
docker rmi pgloader:local
docker network rm pgloader
if [ -d "pgloader" ]; then
  git -C pgloader pull
else
  git clone https://github.com/dimitri/pgloader
fi
cd pgloader
docker build -f Dockerfile -t pgloader:local .
mkdir -p ./srv
docker network create -d bridge pgloader
docker run -d --network pgloader -p 5433:5432 --name postgres postgres:alpine

cat <<EOF> $HOME/pgloader/srv/blockstack_core.sql
create role admin with Superuser CreateRole CreateDB Replication login encrypted password 'password';
grant all on schema public to admin;
create role explorer_prod_rw with LOGIN ENCRYPTED PASSWORD 'password';
create role explorer_prod_ro with LOGIN ENCRYPTED PASSWORD 'password';
create database blockstack_core;
revoke all on database blockstack_core from public;
grant all privileges on database blockstack_core to admin;
grant connect, temp on database blockstack_core to explorer_prod_rw;
grant connect, temp on database blockstack_core to explorer_prod_ro;

-- pgloader
\c blockstack_core;
alter database blockstack_core set default_transaction_read_only = off;
alter database blockstack_core owner to admin;
create schema if not exists blockstack_core authorization explorer_prod_rw;
alter database blockstack_core set search_path TO blockstack_core,public;
alter user explorer_prod_rw set search_path TO blockstack_core,public;
alter user explorer_prod_ro set search_path TO blockstack_core,public;
revoke all on schema public from public;
revoke all on schema blockstack_core from public;
grant connect, temp on database blockstack_core to explorer_prod_rw;
grant connect, temp on database blockstack_core to explorer_prod_ro;
grant all on schema blockstack_core to admin;
grant all on schema blockstack_core to admin;
grant create, usage on schema blockstack_core to explorer_prod_rw;
grant usage on schema blockstack_core to explorer_prod_ro;
grant select on all tables in schema blockstack_core to explorer_prod_ro;
alter default privileges in schema public grant select on tables to explorer_prod_ro;
alter default privileges in schema blockstack_core grant select on tables to explorer_prod_ro;
EOF

cat <<EOF> $HOME/pgloader/srv/sqlite.load
load database
     from sqlite:///srv/subdomains.db
     into postgres://postgres@postgres.pgloader:5432/blockstack_core

 with include drop, create tables, create indexes, reset sequences

  set work_mem to '16MB', maintenance_work_mem to '512 MB';

load database
  from sqlite:///srv/blockstack-server.db
  into postgres://postgres@postgres.pgloader:5432/blockstack_core

WITH include drop, create tables, no truncate,
  batch rows = 10000, batch concurrency = 10,
  create indexes, reset sequences, foreign keys

--SET maintenance_work_mem to '1024MB', work_mem to '128MB', search_path to 'blockstack_core'
  SET search_path to 'blockstack_core'

BEFORE LOAD DO
\$\$ CREATE SCHEMA IF NOT EXISTS pgloader; \$\$;
EOF

docker cp ./srv/blockstack_core.sql postgres:/docker-entrypoint-initdb.d/blockstack_core.sql
echo "sleeping for 5s"
sleep 5
docker exec -u postgres postgres psql postgres postgres -f docker-entrypoint-initdb.d/blockstack_core.sql
# echo "Copy blockstack-server.db and subdomains.db into $HOME/pgloader/srv/"
# echo " then press any key"
# read ans
docker run -it --network pgloader -v "$HOME/pgloader/srv:/srv" pgloader:local pgloader /srv/sqlite.load
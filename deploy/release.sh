#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "Missing deploy/.env; create it from environment.template.txt on the server" >&2
  exit 1
fi
set -a
. ./.env
set +a

docker compose --env-file .env up -d mysql
attempt=0
until docker compose --env-file .env exec -T mysql mysqladmin ping -h localhost -uroot -p"${MYSQL_ROOT_PASSWORD}" --silent; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "MySQL did not become healthy in time" >&2
    exit 1
  fi
  sleep 2
done

docker compose --env-file .env run --rm app pnpm drizzle-kit migrate
docker compose --env-file .env up -d --build app caddy
docker compose --env-file .env ps

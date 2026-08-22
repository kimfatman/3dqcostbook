#!/usr/bin/env sh
set -eu

DEPLOY_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
APP_DIR="$(CDPATH= cd -- "$DEPLOY_DIR/.." && pwd)"
RUNTIME_FILE="${COSTBOOK_RUNTIME_FILE:-$APP_DIR/../deploy/runtime.secrets}"
cd "$DEPLOY_DIR"

if [ ! -f "$RUNTIME_FILE" ]; then
  echo "Missing private runtime configuration; set COSTBOOK_RUNTIME_FILE or create /opt/cost-book/deploy/runtime.secrets" >&2
  exit 1
fi
set -a
. "$RUNTIME_FILE"
set +a

docker compose --env-file "$RUNTIME_FILE" up -d mysql
attempt=0
until docker compose --env-file "$RUNTIME_FILE" exec -T mysql mysqladmin ping -h localhost -uroot -p"${MYSQL_ROOT_PASSWORD}" --silent; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "MySQL did not become healthy in time" >&2
    exit 1
  fi
  sleep 2
done

docker compose --env-file "$RUNTIME_FILE" build app
docker compose --env-file "$RUNTIME_FILE" run --rm app pnpm drizzle-kit migrate
docker compose --env-file "$RUNTIME_FILE" up -d app caddy
docker compose --env-file "$RUNTIME_FILE" ps

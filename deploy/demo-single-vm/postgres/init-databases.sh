#!/bin/sh
set -eu

create_database() {
  database="$1"
  if [ -z "$database" ]; then
    return
  fi

  exists="$(psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT 1 FROM pg_database WHERE datname = '$database'")"
  if [ "$exists" = "1" ]; then
    echo "Database '$database' already exists"
    return
  fi

  echo "Creating database '$database'"
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$database\" OWNER \"$POSTGRES_USER\""
}

create_database "$AUTH_DB"
create_database "$USER_DB"
create_database "$WIKI_DB"

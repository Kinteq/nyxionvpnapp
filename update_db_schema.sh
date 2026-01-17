#!/usr/bin/env bash
set -euo pipefail

DB_HOST=${DB_HOST:-"62.60.217.189"}
DB_PORT=${DB_PORT:-"5432"}
DB_NAME=${DB_NAME:-"nyxion_vpn"}
DB_USER=${DB_USER:-"nyxion_vpn"}

psql "host=$DB_HOST port=$DB_PORT dbname=$DB_NAME user=$DB_USER" -f update_db_schema.sql

echo "✅ DB schema updated: promo_code column ensured; unique index on subscriptions(user_id) present."
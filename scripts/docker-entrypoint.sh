#!/bin/sh
# Prepare DATA_DIR at container start, then hand off to the CMD.
#
# This must run at boot rather than at build time: on hosts like Railway or
# Fly.io a persistent volume is mounted over DATA_DIR, which shadows anything
# baked into the image. Both steps are idempotent — migrations are
# CREATE TABLE IF NOT EXISTS, and the seed upserts the demo project by slug —
# so re-running on every restart is safe.
set -e

DATA_DIR="${DATA_DIR:-/app/data}"
mkdir -p "$DATA_DIR/repos" "$DATA_DIR/tmp"

echo "[entrypoint] migrating database in $DATA_DIR"
pnpm db:migrate

if [ "${SKIP_SEED:-0}" = "1" ]; then
  echo "[entrypoint] SKIP_SEED=1 — leaving demo project alone"
else
  echo "[entrypoint] seeding demo project"
  pnpm seed
fi

echo "[entrypoint] starting: $*"
exec "$@"

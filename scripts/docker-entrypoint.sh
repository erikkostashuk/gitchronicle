#!/bin/sh
# Prepare DATA_DIR at container start, then hand off to the CMD as an
# unprivileged user.
#
# Two things force this to happen at boot rather than at build time:
#
#  1. A persistent volume (Railway, Fly, Render) is mounted over DATA_DIR,
#     which shadows anything baked into the image — so the schema and demo seed
#     have to be (re)created here. Both steps are idempotent: migrations are
#     CREATE TABLE IF NOT EXISTS and the seed upserts the demo project by slug.
#
#  2. That volume arrives owned by root, while the app runs as `nextjs`. The
#     container therefore starts as root purely to take ownership of the mount,
#     then drops privileges before exec'ing the server. Without this the very
#     first mkdir fails with EACCES and the container exits — which surfaces on
#     Railway as a healthcheck failure, not a build failure.
set -e

DATA_DIR="${DATA_DIR:-/app/data}"
APP_USER="${APP_USER:-nextjs}"
APP_UID="${APP_UID:-1001}"
APP_GID="${APP_GID:-1001}"

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$DATA_DIR/repos" "$DATA_DIR/tmp"
  # Only the mount point needs fixing; -R is cheap here because the volume holds
  # just the database plus clone working directories.
  chown -R "$APP_UID:$APP_GID" "$DATA_DIR"
  DROP_PRIV="setpriv --reuid=$APP_UID --regid=$APP_GID --init-groups"
else
  # Already unprivileged (e.g. `docker run --user`): assume the mount is writable
  mkdir -p "$DATA_DIR/repos" "$DATA_DIR/tmp"
  DROP_PRIV=""
fi

echo "[entrypoint] migrating database in $DATA_DIR"
$DROP_PRIV pnpm db:migrate

if [ "${SKIP_SEED:-0}" = "1" ]; then
  echo "[entrypoint] SKIP_SEED=1 — leaving demo project alone"
else
  echo "[entrypoint] seeding demo project"
  $DROP_PRIV pnpm seed
fi

echo "[entrypoint] starting as ${APP_USER}: $*"
exec $DROP_PRIV "$@"

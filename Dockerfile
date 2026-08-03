# syntax=docker/dockerfile:1

# Trixie (glibc 2.41), not bookworm (2.36): better-sqlite3's prebuilt binding
# links against GLIBC_2.38 and fails to dlopen on Debian 12.
FROM node:22-trixie-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    python3 \
    make \
    g++ \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Stage the package manager somewhere world-readable: the runtime user is not
# root, and corepack would otherwise try to re-download pnpm into $HOME at boot.
ENV COREPACK_HOME=/opt/corepack
RUN corepack enable \
  && corepack prepare pnpm@10.14.0 --activate \
  && chmod -R a+rX /opt/corepack

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATA_DIR=/app/data
# Migrate + seed so the build has a database to render against; the runtime
# entrypoint repeats both because a mounted volume shadows this directory.
RUN pnpm db:migrate && pnpm seed && pnpm build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATA_DIR=/app/data
ENV PORT=3000
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs --home /home/nextjs nextjs \
  && mkdir -p /home/nextjs && chown -R nextjs:nodejs /home/nextjs
ENV HOME=/home/nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src
COPY --from=builder /app/data ./data
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/.env.example ./.env.example

COPY --from=builder /app/scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN mkdir -p /app/data/repos /app/data/tmp && chown -R nextjs:nodejs /app/data

# Intentionally NOT `USER nextjs`: the entrypoint needs root to take ownership
# of a freshly-mounted (root-owned) volume, and drops to nextjs via setpriv
# before exec'ing the server. See scripts/docker-entrypoint.sh.
EXPOSE 3000

# PORT is injected by most container hosts (Railway, Fly, Render); honour it.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["pnpm", "start"]

# syntax=docker/dockerfile:1

# Build stage is discarded; keep glibc here so Vite/esbuild stay boring.
FROM node:22-bookworm-slim AS web
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web ./apps/web
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --filter @localtrace/web... \
    && pnpm --filter @localtrace/web build \
    && rm -rf apps/web/node_modules node_modules

# Runtime: Alpine bun, no apt, no curl. bun:sqlite is built into bun.
FROM oven/bun:1-alpine
WORKDIR /app

COPY apps/api/package.json ./
RUN bun install --production --no-cache \
    && rm -rf /root/.bun/install/cache

COPY apps/api/src ./src
COPY apps/api/proto ./proto
COPY apps/api/tsconfig.json ./
COPY --from=web /app/apps/web/dist ./public

ENV LT_DATABASE_PATH=/app/data/localtrace.db \
    LT_API_PORT=4318 \
    LT_WEB_ROOT=/app/public \
    NODE_ENV=production

RUN mkdir -p /app/data && chown bun:bun /app/data
USER bun

EXPOSE 4318 4317

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD bun -e "fetch('http://127.0.0.1:4318/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "src/index.ts"]

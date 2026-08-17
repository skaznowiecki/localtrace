FROM node:22-bookworm-slim

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --filter @local-tracer/web...

COPY apps/web ./apps/web

WORKDIR /app/apps/web

EXPOSE 8080
CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "8080"]

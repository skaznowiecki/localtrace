FROM oven/bun:1-debian

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY apps/api/package.json ./
RUN bun install --production
COPY apps/api/src ./src
COPY apps/api/proto ./proto
COPY apps/api/tsconfig.json ./

ENV LT_DATABASE_PATH=/app/data/local-tracer.db
ENV LT_API_PORT=4318

RUN mkdir -p /app/data

EXPOSE 4318 4317
CMD ["bun", "src/index.ts"]

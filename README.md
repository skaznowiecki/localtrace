# Local Tracer

> Chrome DevTools for distributed systems. Open Source. Local First. Docker First.

## Week 1 Goal

```
just dev → SQLite → GET /api/traces → React
```

## Quick Start

```bash
pnpm install
just migrate
just dev
```

Open [http://localhost:8080](http://localhost:8080).

### What `just dev` does

1. **Runs the API with hot reload** — `bun --hot` on `apps/api` (handler swap, same port).
2. **Runs the web UI** — `pnpm --filter @local-tracer/web dev`.

SQLite WAL allows concurrent readers of the live file. Inspect with DBeaver or `sqlite3` while the API is running:

```
./data/local-tracer.db
```

Apply schema without starting the server:

```
just migrate
```

Or with Docker:

```bash
docker compose up
```

## Architecture (Week 1)

```
React → Bun API (Hono) → SQLite
         ↑ OTLP /v1/traces|logs|metrics
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `LT_DATABASE_PATH` | `./data/local-tracer.db` | SQLite file path |
| `LT_API_PORT` | `4318` | API + OTLP HTTP server port |
| `LT_OTLP_MAX_BODY_BYTES` | `16777216` | Max decompressed OTLP request body |
| `LT_LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` \| `silent` |

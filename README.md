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
         ↑ Sentry POST /api/:projectId/envelope
```

## Sentry DSN

Point any Sentry SDK at local-tracer. Public key and project id are ignored (`1` is the documented default — SDKs typically require a numeric project id):

```js
Sentry.init({ dsn: "http://local@127.0.0.1:4318/1" })
```

```bash
export SENTRY_DSN=http://local@127.0.0.1:4318/1
```

The API logs this DSN on startup. SDKs POST envelopes to `/api/1/envelope/`.

Ingested:

- `transaction` and `span` items → traces
- `event` items (errors / messages) → logs (correlated by `trace_id` when present)

Discarded: sessions, attachments, profiles, replays, metrics, check-ins, and other envelope item types.

## MCP (agents)

With the API running (`just dev`), agents talk to Streamable HTTP at [http://127.0.0.1:4318/mcp](http://127.0.0.1:4318/mcp).

This repo wires Cursor via [`.cursor/mcp.json`](.cursor/mcp.json). Tools call the same services as `GET /api/traces`, `/api/traces/:id`, `/sql`, `/logs`, `/api/services`, and `/facets`.

```bash
npx @modelcontextprotocol/inspector http://127.0.0.1:4318/mcp
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `LT_DATABASE_PATH` | `./data/local-tracer.db` | SQLite file path |
| `LT_API_PORT` | `4318` | API + OTLP HTTP server port |
| `LT_OTLP_MAX_BODY_BYTES` | `16777216` | Max decompressed ingest body (OTLP and Sentry) |
| `LT_LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` \| `silent` |

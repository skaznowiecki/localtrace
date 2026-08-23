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

Open [http://localhost:4371](http://localhost:4371).

### What `just dev` does

1. **Runs the API with hot reload** — `bun --hot` on `apps/api` (handler swap, same port).
2. **Runs the web UI** — `pnpm --filter @local-tracer/web dev`.

SQLite WAL allows concurrent readers of the live file. Inspect with DBeaver or `sqlite3` while the API is running:

```
./data/local-tracer.db
```

Wipe the local DB and recreate schema (data is discarded):

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
         ↑ Datadog Agent HTTP /info /v0.x/traces /v1/input /api/v2/logs /api/v1/series
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

## Datadog Agent

Point `dd-trace` / `ddtrace` at this process (same port as OTLP, default `4318`). No extra 8126 listener.

```bash
export DD_TRACE_AGENT_URL=http://127.0.0.1:4318
# aliases:
# DD_AGENT_HOST=127.0.0.1  DD_TRACE_AGENT_PORT=4318
```

The API logs this URL on startup. Implemented:

- `GET /info` — discovery (`/v0.3`–`/v0.7/traces` only; `/v1.0/traces` is not advertised)
- `PUT`/`POST` `/v0.3/traces` (empty 200) and `/v0.4` `/v0.5` `/v0.7/traces` (JSON or msgpack; sampling `rate_by_service`)
- `POST` `/v1/input`, `/v1/input/:apiKey`, `/api/v2/logs` — HTTP logs
- `POST` `/api/v1/series`, `/api/v2/series` — HTTP metrics
- Stubs `200`: `/v0.4/services`, `/v0.6/stats`, `/v0.7/config`, telemetry proxy

DogStatsD UDP 8125 is out of scope.

## MCP (agents)

With the API running (`just dev`), agents talk to Streamable HTTP at [http://127.0.0.1:4318/mcp](http://127.0.0.1:4318/mcp).

This repo wires Cursor via [`.cursor/mcp.json`](.cursor/mcp.json). Tools call the same services as `GET /api/traces`, `/api/traces/:id`, `/sql`, `/logs`, `/api/services`, and `/facets`. `local-tracer-db` is a stdio SQLite MCP on `./data/local-tracer.db`.

```bash
npx @modelcontextprotocol/inspector http://127.0.0.1:4318/mcp
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `LT_DATABASE_PATH` | `./data/local-tracer.db` | SQLite file path |
| `LT_API_PORT` | `4318` | API + OTLP HTTP server port |
| `LT_OTLP_MAX_BODY_BYTES` | `16777216` | Max decompressed ingest body (OTLP, Sentry, Datadog) |
| `LT_LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` \| `silent` |

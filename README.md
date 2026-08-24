# Local Tracer

**Observability for coding agents.** Local-first. Agent-first. Native connectors.

An agent that writes code without seeing the running system is guessing. It can read the source, run tests, and grep logs — but it cannot see *what actually happened*: which SQL was slow, which HTTP call returned 500, which Redis key missed, which span failed.

Local Tracer exists to close that gap.

> **The goal is not another dashboard.**  
> The goal is **visibility for the agent** — so it can test, debug, and develop against the real behavior of the system, not only against the code it wrote.

```
your app  ──OTLP / Sentry / Datadog──►  Local Tracer  ──MCP──►  the agent
                                              │
                                              └── UI (optional, for you)
```

## Why agent-first

Every surface in this project is built so a coding agent can *use* it, not just so a human can look at it.

| Surface | Who it is for | Role |
| --- | --- | --- |
| **MCP** (`/mcp`) | The agent | Primary interface. Query traces, SQL, logs, services. Investigate a failure. |
| **Native ingest** | Your existing SDKs | Zero new instrumentation. Point OTLP, Sentry, or `dd-trace` at localhost. |
| **HTTP API** | Agent + UI | Same services as MCP. Deterministic, filterable, local. |
| **UI** | You | Companion view. The agent does not need it. |

The UI is a human overlay on the same data. MCP is the product.

That means:

- Tools, resources, and prompts are first-class — not an afterthought bolted onto a REST API.
- Tool descriptions tell the agent *how to investigate*, not just what a field is called.
- Ingest speaks the protocols agents and apps already emit. No custom SDK, no vendor lock-in, no cloud account.
- Storage is a local SQLite file. Disposable. Inspectable. The agent can read it.

## What it does

Local Tracer is a **local APM** that sits on your machine, accepts telemetry from your app, and exposes it to coding agents over [MCP](https://modelcontextprotocol.io).

1. **Ingest** — your app already talks OpenTelemetry, Sentry, or Datadog. Point those SDKs at `127.0.0.1:4318`.
2. **Store** — traces, logs, and metrics land in SQLite. No cluster. No account.
3. **See** — the agent lists traces, opens a span tree, pulls the slowest SQL, and reads correlated logs. You can do the same in the UI if you want.

Use it while an agent is building a feature, writing a migration, or chasing a bug: run the app, hit the path, ask the agent what happened.

## Native connectors

You do not add a Local Tracer SDK. You do not rewrite instrumentation.

The API **is** an OTLP collector, a Sentry ingest, and a Datadog Agent — on one port.

| Connector | What you point at Local Tracer | What is ingested |
| --- | --- | --- |
| **OpenTelemetry** | `OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318` | Traces, logs, metrics (`POST /v1/traces\|logs\|metrics`, JSON or protobuf, gzip optional) |
| **Sentry** | `SENTRY_DSN=http://local@127.0.0.1:4318/1` | Transactions + spans → traces; error/message events → logs (correlated by `trace_id` when present) |
| **Datadog** | `DD_TRACE_AGENT_URL=http://127.0.0.1:4318` | `dd-trace` / `ddtrace` traces (JSON or msgpack), HTTP logs, HTTP metrics |

No extra process. No UDP DogStatsD. No cloud forwarder. The same Bun server answers all three.

### OpenTelemetry

Any OTLP HTTP exporter. JSON and protobuf.

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318
```

### Sentry

Point any Sentry SDK at Local Tracer. Public key and project id are ignored (`1` is the documented default — SDKs typically require a numeric project id).

```js
Sentry.init({ dsn: "http://local@127.0.0.1:4318/1" })
```

```bash
export SENTRY_DSN=http://local@127.0.0.1:4318/1
```

The API logs this DSN on startup. SDKs POST envelopes to `/api/1/envelope/`.

Ingested: `transaction` and `span` items → traces; `event` items (errors / messages) → logs.  
Discarded: sessions, attachments, profiles, replays, metrics, check-ins, and other envelope item types.

### Datadog Agent

Point `dd-trace` / `ddtrace` at this process (same port as OTLP). No extra 8126 listener.

```bash
export DD_TRACE_AGENT_URL=http://127.0.0.1:4318
# aliases:
# DD_AGENT_HOST=127.0.0.1  DD_TRACE_AGENT_PORT=4318
```

The API logs this URL on startup. Implemented:

- `GET /info` — discovery (`/v0.3`–`/v0.7/traces`; `/v1.0/traces` is not advertised)
- `PUT`/`POST` `/v0.3/traces` (empty 200) and `/v0.4` `/v0.5` `/v0.7/traces` (JSON or msgpack; sampling `rate_by_service`)
- `POST` `/v1/input`, `/v1/input/:apiKey`, `/api/v2/logs` — HTTP logs
- `POST` `/api/v1/series`, `/api/v2/series` — HTTP metrics
- Stubs `200`: `/v0.4/services`, `/v0.6/stats`, `/v0.7/config`, telemetry proxy

DogStatsD UDP 8125 is out of scope.

## MCP — the agent interface

With the API running, agents talk **Streamable HTTP** at [http://127.0.0.1:4318/mcp](http://127.0.0.1:4318/mcp).

This repo wires Cursor via [`.cursor/mcp.json`](.cursor/mcp.json). The server is **agent-first**: compact payloads, `since_minutes`, and a playbook in server `instructions`. Tools still call the same `execute` services as HTTP. Do **not** attach a raw SQLite MCP.

```bash
npx @modelcontextprotocol/inspector http://127.0.0.1:4318/mcp
```

### Playbook

1. `list_facets` / `list_log_facets` / `list_metric_facets` before inventing filter values.
2. Prefer `since_minutes` (e.g. `15`) over RFC3339 `since`.
3. `list_traces` returns compact cards with `total` / `next_offset`. Do **not** call `get_trace` in a loop over the list.
4. `get_trace` defaults to **overview** (tree without attributes). Use `get_span` for attributes, `get_trace_spans` / `get_trace_sql` for typed payloads, `get_trace_logs` for logs.
5. If `breakdown` is `null`, retry `get_trace` shortly (still processing).

### Tools

| Tool | What the agent gets |
| --- | --- |
| `list_facets` | Valid trace filter values |
| `list_traces` | Recent traces (paginated). Prefer `since_minutes` |
| `get_trace` | Overview (default) or `detail=full` |
| `get_span` | One span with attributes |
| `get_trace_sql` | DB queries in a trace, sorted by duration |
| `get_trace_spans` | Typed payloads: `sql` / `redis` / `mongo` / `prisma` / `http` / `express` / `s3` / `openrouter` / `trpc` / `error` |
| `search_spans` | Cross-trace search (name/attributes, type, service) |
| `get_trace_logs` | Logs correlated to a `trace_id` |
| `list_log_facets` | Services and severity buckets for log filters |
| `list_logs` | Recent logs (attributes omitted unless `raw`) |
| `list_services` | Services that have ingested traces |
| `list_metric_facets` | Metric names and services |
| `query_metrics` | Recent metric points |

Prompts: `investigate_trace`, `debug_errors`, `find_slow`.

### Example loop

```
agent writes a handler
    → you (or the agent) hit the endpoint
    → telemetry lands in Local Tracer
    → agent calls list_traces / get_trace / get_trace_sql
    → agent sees the slow query, the 500, the missing span
    → agent fixes the code
    → repeat
```

That loop is the product.

## Quick start

### Docker (recommended)

```bash
docker run --rm -p 4318:4318 \
  -v local-tracer-data:/app/data \
  ghcr.io/skaznowiecki/local-tracer:latest
```

Open [http://localhost:4318](http://localhost:4318). UI, ingest (OTLP / Sentry / Datadog), and MCP all share port `4318`. Data lives in the `local-tracer-data` volume.

The image is published to GHCR on `v*` tags. After the first release, set the package visibility to **public** under GitHub → Packages.

### Development

Requires [pnpm](https://pnpm.io), [Bun](https://bun.sh), [Node](https://nodejs.org), and [Just](https://github.com/casey/just).

```bash
pnpm install
just migrate
just dev
```

- UI: [http://localhost:4371](http://localhost:4371)
- API + ingest + MCP: [http://127.0.0.1:4318](http://127.0.0.1:4318)

```bash
just docker-build   # production image, locally tagged local-tracer:dev
docker compose up   # two-container HMR stack
```

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

## Architecture

```
app SDKs
  OTLP  /v1/traces | /v1/logs | /v1/metrics
  Sentry  POST /api/:projectId/envelope
  Datadog  /info  /v0.x/traces  /v1/input  /api/v2/logs  /api/v1/series
       │
       ▼
Bun + Hono API  ──►  SQLite (local)
       │
       ├── MCP  /mcp          ← the agent
       ├── HTTP /api/traces   ← the agent + the UI
       └── UI   :4371         ← you
```

Local-first: one process, one file, no vendor cloud. Data is disposable — `just migrate` wipes and recreates.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `LT_DATABASE_PATH` | `./data/local-tracer.db` | SQLite file path |
| `LT_API_PORT` | `4318` | API + ingest + MCP port |
| `LT_OTLP_MAX_BODY_BYTES` | `16777216` | Max decompressed ingest body (OTLP, Sentry, Datadog) |
| `LT_LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` \| `silent` |
| `LT_WEB_ROOT` | unset | Directory of the built UI. Set in the production image so the API serves the SPA. |

## Status

Early and local-only. Schema and APIs change without migration paths — wipe and re-ingest. That is intentional: this is a development instrument for agents, not a production APM.

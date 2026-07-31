# Local Tracer

> Chrome DevTools for distributed systems. Open Source. Local First. Docker First.

## Week 1 Goal

```
just dev → DuckDB → GET /api/traces → React
```

## Quick Start

```bash
pnpm install
just dev    # auto-installs cargo-watch on first run
```

Open [http://localhost:8080](http://localhost:8080).

### What `just dev` does

On startup, `just dev`:

1. **Releases the DuckDB file lock** — stops any process holding `LT_DATABASE_PATH` (default `./data/local-tracer.db`), e.g. a stale `api`, `duckdb` CLI, or DBeaver. Uses `kill`, then `kill -9` if needed.
2. **Starts a read-only snapshot loop** — every 5 seconds copies the database to a sibling file:
   - Source: `./data/local-tracer.db`
   - Snapshot: `./data/local-tracer-readonly.db` (+ `.wal` when present)
   - Copies use a temp file + rename so readers never see a half-written file.
3. **Runs the API with hot reload** — `cargo watch -x 'run -p api'` (watches `apps/` and `packages/`).
4. **Runs the web UI** — `pnpm dev`.

DuckDB allows only one process to lock the database file at a time. The API owns the live file; external tools should use the snapshot.

**Inspect with DBeaver (or `duckdb` CLI) while dev is running:**

```
./data/local-tracer-readonly.db
```

Connect to that path, not `local-tracer.db`. Data is ~5 seconds behind the live database. Re-run queries to see updates.

Or with Docker:

```bash
docker compose up
```

## Architecture (Week 1)

```
React → API → Query / Ingest → Engine → DuckDB
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `LT_DATABASE_PATH` | `./data/local-tracer.db` | DuckDB file path |
| `LT_API_PORT` | `4318` | API + OTLP HTTP server port |
| `LT_OTLP_MAX_BODY_BYTES` | `16777216` | Max decompressed OTLP request body |
| `LT_OTLP_MAX_IN_FLIGHT` | `4` | Concurrent OTLP ingest requests |
| `LT_LOG_LEVEL` | `info` | Log level |

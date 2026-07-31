# AGENTS.md

## Frontend stack (`apps/web`)

- React 19 + TypeScript
- Vite 6
- TanStack Router
- Tailwind CSS 4
- shadcn/ui (Base UI) + Lucide

## Structure — feature-based

Colocate by feature, not by type.

```
src/
  features/<feature>/   # components, hooks, api, types
  components/ui/        # shared primitives only (shadcn)
  routes/               # thin route shells → import from features
  lib/                  # shared utils
```

### Rules

- New UI/logic lives in `features/<name>/`, not in `components/` or `routes/`.
- Routes only wire URL → feature. No business logic in route files.
- `components/ui/` is shared primitives only — never feature-specific code.
- Prefer colocation: keep a feature's pieces together; extract to shared only when reused by 2+ features.
- **Interactive elements get `cursor-pointer`.** Any control with an action (buttons, toggles, collapsible triggers, clickable rows, expand/collapse chevrons, links that act as buttons) must use `cursor-pointer`. Prefer putting it on shared primitives (`Button`, `Toggle`, `CollapsibleTrigger`, …) so feature code inherits it; add it explicitly on custom `<button>` / clickable surfaces.

### Span overview strategies (`features/traces`)

Custom Overview panels for known span types (HTTP first). Detect via **semantic attributes**, not `span.kind`.

```
features/traces/components/span-overview/
  types.ts              # SpanOverviewStrategy { id, match, render }
  resolve.ts            # first-match resolver
  KvRow.tsx             # shared label/value row
  strategies/
    index.ts            # ordered registry (first match wins)
    http.tsx            # HTTP Requests overview
```

**Rules**

- Add a strategy: implement `match(span)` + `render(span)`, register in `strategies/index.ts`.
- Detection helpers live in `features/traces/lib/` (e.g. `http-spans.ts`, `sql-spans.ts`).
- When a strategy matches, `TraceSpanDetails` collapses **Span Attributes** by default.
- Attribute-value strategies (`attribute-value/strategies/`) are separate — they style leaf string values in the tree, not the Overview layout.

### HTTP display badges (`features/traces`)

Shared presentational badges for HTTP method and status code. Use these everywhere those values appear — do **not** inline color classes.

```
features/traces/components/
  HttpMethodBadge.tsx       # GET / POST / … colored verb badge
  HttpStatusCodeBadge.tsx   # 200 / 404 / 500 … colored status badge
  HttpPath.tsx               # path / URL with param + query highlights
```

**Rules**

- Method verbs → `HttpMethodBadge` (list name, drawer header, span details, HTTP overview).
- Status codes → `HttpStatusCodeBadge` (list Status column, drawer header, span details, HTTP overview).
- Paths / URLs → `HttpPath`.
- List Status column prefers `HttpStatusCodeBadge` when `trace.httpStatusCode` is set; otherwise falls back to `TraceStatusBadge` (ok/error/unset).
- Do **not** N+1-fetch `/api/traces/{id}` to enrich the list. Detail is loaded only when the drawer opens (`useTraceDetail`). List `httpStatusCode` comes from the list API when present; otherwise show `TraceStatusBadge`.

## Anatomy of a feature

A feature is a self-contained slice of the app (e.g. `traces`, `logs`). Everything it needs lives together and it exposes a small public surface through `index.ts`.

```
features/traces/
  components/       # UI for this feature only
  hooks/            # feature logic (data, state, side effects)
  api/              # network calls + query/mutation definitions
  context/          # cross-component state (only if needed)
  types.ts          # feature types
  index.ts          # public surface — the only thing routes/other features import
```

### Rules

- Import a feature only through its `index.ts`. Never reach into its internals (`features/traces/hooks/useX`) from outside.
- A feature may depend on `components/ui`, `lib`, and its own files. It should **not** import from another feature's internals — if two features share code, lift it to `lib/` (utils) or `components/ui` (primitives).
- Keep files small and named by role: `TraceList.tsx`, `useTraces.ts`, `traces.api.ts`.

## Hooks vs Context — how to decide

Default to **hooks**. Reach for **context** only when prop drilling becomes the problem.

### Use a hook (`hooks/useX.ts`) when

- You fetch or derive data (`useTraces`, `useLogFilters`).
- You encapsulate logic/side effects so a component stays presentational.
- State is local to one component or shared by lifting state up 1–2 levels.
- It's the default choice: cheap, testable, no extra indirection.

```tsx
// features/traces/hooks/useTraces.ts
export function useTraces(params: TraceQuery) {
  // fetching + derived state live here, component stays dumb
}
```

### Use context (`context/XProvider.tsx`) when

- Multiple components across different levels need the **same** state and passing props would drill through unrelated layers.
- The state is genuinely feature-wide (e.g. selected trace, filter panel state shared by toolbar + table + detail).
- You want a stable provider boundary scoped to the feature, not the whole app.

```tsx
// features/traces/context/TracesProvider.tsx
// Provider wraps the feature subtree; expose access via a hook:
export function useTracesContext() { /* useContext + guard */ }
```

### Guidance

- Context is for **distribution**, hooks are for **logic**. They combine: a provider holds state via a hook, consumers read it via a `useXContext()` hook.
- Don't put context at the app root unless the state is truly global (theme, auth). Feature state stays inside the feature.
- If only 2–3 components need it and they're close, lift state up instead of adding context.
- Never export a raw `Context` object — always expose a `useXContext()` hook that throws if used outside its provider.

## How each piece maps

| Need | Goes in |
| --- | --- |
| Screen/URL wiring | `routes/` (thin shell) |
| Feature UI | `features/<f>/components/` |
| Data fetching / logic | `features/<f>/hooks/` + `api/` |
| Cross-component feature state | `features/<f>/context/` |
| Reusable primitive (button, input) | `components/ui/` |
| Generic helper (formatting, cn) | `lib/` |
| Truly global state | app-level provider in `routes/__root` |

## Backend architecture (Rust workspace)

Local Tracer is a Cargo workspace. The backend receives OTLP telemetry (traces, logs, metrics), persists it in DuckDB, and exposes a REST API for the web UI.

### Workspace layout

```
apps/
  api/                  # HTTP server (Axum) — presentation layer
  web/                  # React frontend (see Frontend stack above)

packages/
  common/               # App config, shared errors, JSON helpers
  domain/               # Domain models + rules (no DB, no HTTP, no OTLP)
  engine/               # Persistence — DuckDB repositories
  adapter/              # External format adapters (OTLP today, more later)
  service/              # Application services — one per entity, write-only for now
```

### Layer diagram

```
OTel SDK / apps
       │  OTLP HTTP
       ▼
  apps/api              presentation — handlers, DTOs, HTTP status codes
       │
       ├── adapter::otlp   decode + map OTLP → domain types
       │
       ├── service::*      use cases (ingest per entity)
       │
       └── engine::Repositories   read queries (temporary — no read services yet)
       │
       ▼
  packages/engine       DuckDB repositories
       │
       ▼
  packages/domain       SpanRecord, LogRecord, etc.
```

### Data flow — ingest (write)

```
POST /v1/traces
  → api/otlp.rs          parse headers, semaphore, spawn_blocking
  → adapter::otlp        decode_body → map_traces_json/protobuf
  → service::SpanService ingest(&[SpanRecord])
  → engine::SpanRepository insert()
  → DuckDB
```

### Data flow — read (temporary)

Read endpoints exist in the API but there is **no read service layer yet**. Routes call `Repositories` directly until a real query use case is needed (e.g. `TraceQueryService`).

```
GET /api/traces
  → api/routes.rs
  → repos.traces.list()        # direct repo access — not through service
  → api/mappers.rs             domain → JSON DTO
```

### Package responsibilities

| Package | Role | Depends on | Must NOT depend on |
| --- | --- | --- | --- |
| `common` | Config (`LT_*` env vars), `AppError`/`AppResult`, JSON helpers | — | domain, engine, adapter, service |
| `domain` | Entities, value objects, domain rules | serde | engine, adapter, service, HTTP, OTLP |
| `engine` | DuckDB connection, schema migrations, repositories | common, domain | adapter, service, HTTP |
| `adapter` | Translate external protocols → domain types | domain | engine, service, common |
| `service` | Application use cases (ingest per entity) | common, domain, engine | adapter, HTTP |
| `api` | HTTP routing, OTLP export handlers, REST DTOs | all of the above | — (orchestrates) |

### `packages/domain`

Pure domain — no I/O, no framework dependencies beyond serde.

```
domain/src/
  entities/           # SpanRecord, TraceSummary, LogRecord, MetricDataPoint, ServiceSummary
  value_objects/      # TraceStatus
  rules/              # ids.rs — trace/span ID normalization, is_root_parent
```

**Rules**

- Put structs with identity here (`SpanRecord`, `LogRecord`, …).
- Put domain rules here (`normalize_trace_id`, `is_root_parent`).
- Do **not** move domain knowledge to `common` (e.g. ID normalization is telemetry-specific, not generic infra).
- `ServiceSummary` is a read model (service name + trace count) — not the application "service layer".

### `packages/engine`

Persistence layer. Owns the DuckDB connection, schema migrations, and per-entity repositories.

```
engine/src/
  storage/
    connection.rs     # DatabaseConnection (mutex-wrapped DuckDB handle)
    schema/           # migration runner + SQL files
  repository/
    mod.rs            # Repositories — bundles all repos, runs init_schema on open
    span.rs           # SpanRepository
    trace.rs          # TraceRepository (list, get_with_spans, rebuild_summary)
    log.rs            # LogRepository
    metric.rs         # MetricRepository
    service.rs        # ServiceRepository (ServiceSummary aggregation)
```

**Entry point:** `Repositories::open(database_path)` — creates connection, runs migrations, returns all repositories.

**Rules**

- All SQL lives in `repository/`. No SQL in service or adapter.
- `SpanRepository::insert` rebuilds trace summaries via `TraceRepository::rebuild_summary`.
- Repositories are `Clone` (cheap — they share an `Arc<DatabaseConnection>`).

### `packages/adapter`

Translates external wire formats into domain types. **No knowledge of services, repositories, or HTTP.**

```
adapter/src/
  lib.rs              # pub mod otlp;
  otlp/
    decode.rs         # gzip, content-type, payload size limits
    error.rs          # OtlpError
    values.rs         # OTel AnyValue / KeyValue → JSON helpers
    mappers/
      traces.rs       # OTLP → Vec<SpanRecord>
      logs.rs         # OTLP → Vec<LogRecord>
      metrics.rs      # OTLP → Vec<MetricDataPoint>
```

**Usage:** `use adapter::otlp::{decode_body, map_traces_json, OtlpError, …};`

**Rules**

- If a file imports `opentelemetry-proto` → it belongs in `adapter`.
- Adapters are pure translation. No `AppError`, no `Repositories`, no `SpanService`.
- Future protocols (e.g. another export format) get their own submodule: `adapter::foo`.

### `packages/service`

Application layer — **one service per entity**, write-only for now.

```
service/src/
  span.rs             # SpanService::ingest()
  log.rs              # LogService::ingest()
  metric.rs           # MetricService::ingest()
```

Each service holds only its repository:

```rust
pub struct SpanService {
    repo: SpanRepository,
}

impl SpanService {
    pub fn ingest(&self, spans: &[SpanRecord]) -> AppResult<()> {
        self.repo.insert(spans)
    }
}
```

**Rules**

- One service per entity. Do not create a god-service (`TelemetryService`) that handles all entities.
- Do **not** add list/query methods until there is a real read use case — add a dedicated query service then (e.g. `TraceQueryService`).
- Services talk to repositories, not to adapters or HTTP.
- If a file imports `Storage` or calls SQL → it belongs in `engine`, not `service`.

### `apps/api`

Presentation layer. Wires HTTP to adapter + service + repos.

```
api/src/
  lib.rs              # Router setup
  main.rs             # Repositories::open → AppState → serve
  state.rs            # AppState (services + repos + config)
  otlp.rs             # POST /v1/traces|logs|metrics
  routes.rs           # GET /api/traces, /api/traces/{id}, /api/services, /health
  dto.rs              # JSON response shapes
  mappers.rs          # domain → DTO
```

**`AppState`**

```rust
pub struct AppState {
    pub spans: Arc<SpanService>,      // OTLP trace ingest
    pub logs: Arc<LogService>,        // OTLP log ingest
    pub metrics: Arc<MetricService>,  // OTLP metric ingest
    pub repos: Arc<Repositories>,    // read routes (temporary)
    pub config: Config,
    pub ingest_semaphore: Arc<Semaphore>,
}
```

**OTLP ingest orchestration** (in `otlp.rs`):

```rust
let decoded = decode_body(&body, gzip, max_bytes)?;
let records = map_traces_json(&decoded)?;
spans.ingest(&records)?;
```

Adapter errors (`OtlpError`) and storage errors (`AppError`) are mapped to HTTP status codes in the API layer.

### Where does new code go?

| Task | Location |
| --- | --- |
| New domain type or rule | `packages/domain/src/entities/` or `rules/` |
| New SQL / persistence | `packages/engine/src/repository/` |
| New schema migration | `packages/engine/src/storage/schema/migrations/` |
| New OTLP mapping | `packages/adapter/src/otlp/mappers/` |
| New ingest use case | `packages/service/src/<entity>.rs` |
| New read use case (future) | `packages/service/src/<entity>_query.rs` or similar |
| New HTTP endpoint | `apps/api/src/routes.rs` + `dto.rs` + `mappers.rs` |
| New external protocol | `packages/adapter/src/<protocol>/` |
| App config / generic utils | `packages/common/` |

### Dependency graph

```
common
domain
engine        → common, domain
adapter       → domain
service       → common, domain, engine
api           → common, domain, engine, adapter, service
```

### Mental model (one rule)

> **Adapter** translates external formats → domain.
> **Service** executes use cases → repository.
> **API** connects HTTP → adapter + service (+ repos for reads until query services exist).

## Engine stack (`packages/engine`)

- Rust + DuckDB via the official [`duckdb`](https://duckdb.org/docs/current/clients/rust) crate (`bundled` feature)
- `storage/` owns the DB connection and schema migrations
- `repository/` owns all SQL — one repository per table/aggregate (`SpanRepository`, `TraceRepository`, …)
- `Repositories::open` runs migrations on startup via `storage::init_schema`

## DuckDB schema migrations

Migrations are versioned SQL files applied sequentially at startup. Version is tracked in `schema_meta.version`.

```
packages/engine/src/storage/
  connection.rs             # DatabaseConnection
  schema/
    mod.rs                  # migration runner (do not put DDL here)
    migrations/
      spans.sql             # table + indexes
      traces.sql
      logs.sql
      metrics.sql
      002_<name>.sql        # incremental migration, etc.
```

### Rules

- **One file per table** for the initial schema (`<table>.sql` with its indexes). Incremental changes use numbered files (`002_<name>.sql`, …).
- **All DDL goes in `storage/schema/migrations/`**. Register numbered migrations in the `MIGRATIONS` slice in `storage/schema/mod.rs`.
- **Never edit a migration that has already been applied** to a DB you care about. Add a new numbered file instead (`002`, `003`, …).
- **Never write backfills.** Do not add data-backfill steps (migration `UPDATE`s that repopulate rows, startup "recompute for existing rows" passes, etc.). New/changed columns only need to be populated for **newly ingested** data. When existing rows must reflect a schema/logic change during dev, **wipe the DB and restart** — do not migrate the old data forward.
- **During local dev**, if you need to re-run from scratch: delete `./data/local-tracer.db` (or move it), edit the migration SQL, restart. This is the intended workflow — no down migrations, no backfills.
- Migrations must be **sequential** (v1, v2, v3…). The runner rejects gaps (e.g. DB at v1 but only v3 exists).
- Each `.sql` file can contain multiple statements separated by `;`. Do not put semicolons inside string literals.
- `schema_meta` is managed by the runner — do not create or modify it in migration files.

### Running migrations

There is **no separate migration CLI**. Migrations run automatically when the engine opens the database:

```
cargo run -p api
  → main.rs: Repositories::open(&config.database_path)
  → repository/mod.rs: conn.with_conn(init_schema)
  → storage/schema/mod.rs: run_migrations()
```

- **Database path:** `LT_DATABASE_PATH` env var, default `./data/local-tracer.db`.
- **Pending migrations** apply on startup; already-applied ones are skipped (idempotent).
- **Verify** with DuckDB CLI:

```bash
duckdb ./data/local-tracer.db -c "SELECT version FROM schema_meta;"
duckdb ./data/local-tracer.db -c "SELECT table_name FROM information_schema.tables WHERE table_schema='main' ORDER BY table_name;"
```

Expected on a fresh DB: `schema_meta.version = 1`, tables `logs`, `metrics`, `schema_meta`, `spans`, `traces`.

**Legacy schema error:** if startup fails with `legacy MVP database schema detected (traces.id column)`, the DB predates the current migration system. Move or delete `./data/local-tracer.db` (and its `.wal` file if present), then restart the API to create a fresh DB.

### Adding a migration

1. Create `packages/engine/src/storage/schema/migrations/00N_<name>.sql`.
2. Append an entry to `MIGRATIONS` in `storage/schema/mod.rs`:

```rust
Migration {
    version: 2,
    name: "add_foo",
    sql: include_str!("migrations/002_add_foo.sql"),
},
```

3. Restart the engine. Pending migrations apply automatically; already-applied ones are skipped.

### Changing schema in dev (wipe + edit)

1. Stop the engine.
2. Delete or move `./data/local-tracer.db`.
3. Edit the migration SQL (typically the `<table>.sql` files while the project is young).
4. Restart — migrations run on a fresh DB.

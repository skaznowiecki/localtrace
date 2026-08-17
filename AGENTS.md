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

## Backend stack (`apps/api`)

- Bun + TypeScript
- Hono
- DuckDB via `@duckdb/node-api`
- OTLP HTTP (`POST /v1/traces|logs|metrics`) JSON and protobuf (gzip optional)

One app, no Cargo workspace and no extra pnpm packages. Colocate by feature; each feature owns `types/`, `repositories/`, `services/`, `http/`.

```
apps/api/src/
  index.ts              boot
  app.ts                Hono + cors + error handler
  config.ts             LT_* env vars
  db/                   connection queue, migrations, SQL files
  lib/                  ids + attrs (reused by 2+ features)
  features/
    traces/             list GET + persist (called by ingest)
    logs/               list-by-trace GET + persist
    metrics/            persist only
    catalog/            GET /api/services
    ingest/             OTLP providers + ingest service
```

### Feature anatomy (API)

```
features/traces/
  types/            records + HTTP DTOs (no logic)
  repositories/     SQL only
  services/         list.ts (UI) + persist.ts (ingest)
  http/             routes + mappers
  index.ts          register(app) + public persist
```

**Rules**

- SQL lives in `repositories/`. Services call repos, not DuckDB.
- `http/` calls services, not repos.
- Ingest does **not** have repositories. `features/ingest/services/ingest.ts` parses via a **provider** and calls `traces/logs/metrics` persist.
- OTLP is a provider (`features/ingest/providers/otlp/`), not the ingest service. Future protocols get `providers/<name>/`.
- Extract to `src/lib/` only when 2+ features use it (`ids`, `attrs`).
- Trace summary rules (`normalize-route`, `trace-status`) live next to `traces/services/persist.ts`.
- Import another feature only through its `index.ts`.

### Data flow — ingest

```
POST /v1/traces
  → ingest/http (gzip, 429, timeout)
  → ingest/services/ingest.ts
  → providers/otlp (JSON or protobuf → records)
  → traces/services/persist → traces/repositories → DuckDB
```

### Data flow — read

```
GET /api/traces
  → traces/http → traces/services/list → traces/repositories → DuckDB
```

DuckDB is a single writer. `db/client.ts` serializes all work through `run(fn)`.

### Where does new code go?

| Task | Location |
| --- | --- |
| Trace list/detail DTO | `features/traces/types/dto.ts` |
| Trace SQL | `features/traces/repositories/` |
| Trace persist / summary rules | `features/traces/services/` |
| OTLP mapping | `features/ingest/providers/otlp/` |
| New ingest protocol | `features/ingest/providers/<name>/` |
| HTTP route | `features/<name>/http/routes.ts` |
| Shared id/attr helpers | `src/lib/` |
| Schema migration | `apps/api/src/db/sql/` + register in `db/migrate.ts` |
| App config | `src/config.ts` |

## DuckDB schema migrations

Migrations are versioned SQL files applied sequentially at startup. Version is tracked in `schema_meta.version`.

```
apps/api/src/db/
  client.ts
  migrate.ts
  sql/
    001_spans.sql
    001_traces.sql
    001_logs.sql
    001_metrics.sql
    002_trace_http.sql
    003_trace_http_url.sql
    004_trace_http_route.sql
```

### Rules

- Incremental changes use numbered files (`002_<name>.sql`, …).
- **All DDL goes in `apps/api/src/db/sql/`**. Register numbered migrations in `MIGRATIONS` in `db/migrate.ts`.
- **Never edit a migration that has already been applied** to a DB you care about. Add a new numbered file instead.
- **Never write backfills.** New/changed columns only need to be populated for **newly ingested** data. When existing rows must reflect a schema/logic change during dev, **wipe the DB and restart**.
- **During local dev**, if you need to re-run from scratch: delete `./data/local-tracer.db` (or move it), edit the migration SQL, restart.
- Migrations must be **sequential** (v1, v2, v3…). The runner rejects gaps.
- Each `.sql` file can contain multiple statements separated by `;`. Do not put semicolons inside string literals.
- `schema_meta` is managed by the runner — do not create or modify it in migration files.

### Running migrations

There is **no separate migration CLI**. Migrations run when the API opens the database:

```
bun src/index.ts   # or just dev / pnpm --filter @local-tracer/api dev
  → openDb() → initSchema() → CHECKPOINT
```

- **Database path:** `LT_DATABASE_PATH` env var, default `./data/local-tracer.db`.
- **Pending migrations** apply on startup; already-applied ones are skipped (idempotent).
- **Verify** with DuckDB CLI:

```bash
duckdb ./data/local-tracer.db -c "SELECT version FROM schema_meta;"
duckdb ./data/local-tracer.db -c "SELECT table_name FROM information_schema.tables WHERE table_schema='main' ORDER BY table_name;"
```

Expected on a fresh DB: `schema_meta.version = 4`, tables `logs`, `metrics`, `schema_meta`, `spans`, `traces`.

**Legacy schema error:** if startup fails with `legacy MVP database schema detected (traces.id column)`, the DB predates the current migration system. Move or delete `./data/local-tracer.db` (and its `.wal` file if present), then restart the API.

### Adding a migration

1. Create `apps/api/src/db/sql/00N_<name>.sql`.
2. Append an entry to `MIGRATIONS` in `db/migrate.ts`.
3. Restart the API.

### Changing schema in dev (wipe + edit)

1. Stop the API.
2. Delete or move `./data/local-tracer.db`.
3. Edit the migration SQL.
4. Restart — migrations run on a fresh DB.

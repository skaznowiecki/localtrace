# AGENTS.md

## Git commits

Use [Conventional Commits](https://www.conventionalcommits.org/) (`type(optional-scope): description`). Imperative mood, lowercase description, no trailing period.

| Type | When |
| --- | --- |
| `feat` | new user-facing capability |
| `fix` | bug fix |
| `refactor` | change structure, same behavior |
| `docs` | docs only |
| `chore` | tooling, deps, housekeeping |
| `test` | tests only |
| `perf` | performance |
| `ci` | CI / Justfile / Docker |

Scope is optional and names the area (`web`, `api`, `traces`, `ingest`, …). Breaking changes add `!` after the type/scope (`feat(api)!: …`) or a `BREAKING CHANGE:` footer.

```
feat(traces): add HTTP status filter
fix(ingest): reject oversized protobuf bodies
refactor(api): split OTLP json and proto providers
docs: document semantic commits
```

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
- SQLite via `bun:sqlite`
- OTLP HTTP (`POST /v1/traces|logs|metrics`) JSON and protobuf (gzip optional)

One app, no extra pnpm packages. Colocate by feature; each feature owns `types/`, `repositories/`, `services/`, `routes.ts`.

### Prefer native Bun APIs

Node compat works. Native is faster and more idiomatic. Prefer `Bun.*` / `bun:*` over `node:*` when a native equivalent exists. Check the docs before reaching for Node.

| Node compat | Native Bun |
| --- | --- |
| `gunzipSync` from `node:zlib` | `Bun.gunzipSync` |
| `readFile` from `node:fs/promises` | `Bun.file(path).text()` |
| `Database({ create, safeIntegers })` | also set `strict: true` (Bun 1.3) |

Docs:

- [Bun APIs](https://bun.sh/docs/runtime/bun-apis)
- [File I/O](https://bun.sh/docs/api/file-io) — `Bun.file`, `Bun.write`
- [gzip](https://bun.sh/docs/guides/util/gzip) — `Bun.gzipSync`, `Bun.gunzipSync`
- [SQLite](https://bun.sh/docs/api/sqlite) — `bun:sqlite`, `{ create, safeIntegers, strict }`
- [Utils](https://bun.sh/docs/api/utils)

```
apps/api/src/
  index.ts              boot
  app.ts                Hono + cors + error handler
  config.ts             LT_* env vars
  shared/               db/, helpers/, errors/
  features/
    traces/             list GET + store (called by ingest)
    logs/               list-by-trace GET + store
    metrics/            store only
    catalog/            GET /api/services
    ingest/             OTLP providers + ingest service
```

### Feature anatomy (API)

```
features/traces/
  types/            records + HTTP DTOs (no logic)
  repositories/     SQL only
  helpers/          store rules (trace-status) + shared DTO mapping (card)
  services/         list.ts / facets.ts / with-spans.ts + store.ts
  routes.ts         HTTP only
  index.ts          routes + public store
```

**Rules**

- SQL lives in `repositories/`. Services call repos, not SQLite.
- `routes.ts` calls services, not repos. List services return HTTP DTOs. Keep Record → DTO in the service file until a second caller needs it.
- Query params go through `zValidator` + `c.req.valid("query")`. Do not parse `c.req.query()` by hand.
- Ingest does **not** have repositories. `features/ingest/services/ingest.ts` parses via a **provider** and calls `traces/logs/metrics` store.
- Extract to `src/shared/` only when 2+ features use it (`db`, `helpers`, `errors`).
- Trace summary rules (`trace-status`) live in `traces/helpers/`. List services are one `execute` per file (`list.ts`, `facets.ts`, `with-spans.ts`).
- Import another feature only through its `index.ts`.

### Ingest providers

OTLP is one protocol. `providers/otlp/` must contain **only** OTLP-specific code. Request-level helpers that any protocol would reuse live in `providers/shared/`.

```
features/ingest/providers/
  shared/           decode (gzip + maxBytes), media-type
  errors.ts
  types.ts
  resolve.ts        first-match registry
  otlp/
    helpers/        ids, values, paths — OTLP data model only
    mappers/        OTLP request → records
    json/
    proto/
```

**Rules**

- A helper is **generic** if it talks about the HTTP request, not a protocol: gzip / `identity`, body size, `Content-Type` parsing. Put it in `providers/shared/`.
- A helper is **OTLP-specific** if it encodes the OTLP model: hex-vs-bytes IDs (`parseOtlpId`), `AnyValue` / `KeyValue` / `service.name`, `/v1/traces|logs|metrics`. Put it in `providers/otlp/helpers/`.
- Do **not** put decode, media-type, or other request plumbing under `otlp/`. A new protocol (Zipkin, Jaeger, …) must reuse `providers/shared/` and add `providers/<name>/` — it should not import OTLP ids or values.
- OTLP JSON / protobuf stay under `otlp/json/` and `otlp/proto/`. Register the provider in `providers/resolve.ts` (more specific first).

### Naming

Name by **role**, not by restating the module. The file/feature already scopes the noun — don't repeat it in the function (`repo.bulkCreate`, not `repo.insertLogs`).

#### Services

A service file exposes **one** public function: `execute`. The file name is the role.

```ts
import * as list from "./services/list"
await list.execute(db, c.req.valid("query"))
```

Not `list.list`, not `listService`, not `withSpans.withSpans`.

If a file would need two public functions, split it (`list.ts` / `facets.ts` / `with-spans.ts`). Private helpers in the same file are fine (query schema, Record → DTO). List query schemas are the exception to “one public function”: export `query` for `zValidator`.

Write services live in `store.ts` and also export `execute`. The feature `index.ts` re-exports `{ execute as store }` so other features call `store(...)`.

`ingest.ts` is the exception: one file, three signals (`ingestTraces` / `ingestLogs` / `ingestMetrics`). Do not cram unrelated reads into one service file the same way.

#### Repositories

A repository file has many queries. Methods are role verbs: `list` / `get` / `create` / `bulkCreate` / `upsert` / `forTrace` / `facets` / `rebuild`.

Not `listTraces`, not `insertLogs`, not `loadTraceRebuildRows`. Prefix only when the file owns two tables (`upsertSpans` vs `upsert`).

#### Routes

`routes()` at the feature root (not `logsRoutes` in `http/`). HTTP only.

**Mount sub-apps with a prefix.** The sub-app declares relative paths (`/`, `/:id`), never the full URL. Compose in `app.ts`:

```
app.route("/api/traces", logs)      // GET /:id/logs
app.route("/api/traces", traces)    // GET /, GET /facets, GET /:id
app.route("/api/services", catalog) // GET /
app.route("/v1", ingest)            // POST /traces, /logs, /metrics
```

Not `app.route("/", routes())` with absolute paths (`/api/traces/:id`). That duplicates prefixes, weakens `c.req.param()` inference, blocks RPC/`hc`, and skips the sub-app `notFound`. When two features share a prefix, mount the more specific sub-app first (`/:id/logs` before `/:id`).

The **callee owns its details**. Callers pass the minimum; encoding, limits, and other request concerns stay inside the owner (`provider.decode(raw)`, not pre-resolved gzip/maxBytes).

#### Query validation

List/query routes use `@hono/zod-validator`. The list service owns the Zod `query` schema (query → filters) and exports it next to `execute`. The route only wires the validator.

```ts
app.get("/", zValidator("query", list.query, onInvalid), async (c) => {
  return c.json(await list.execute(c.get("db"), c.req.valid("query")))
})
```

**Rules**

- Do **not** parse `c.req.query()` by hand. `execute` receives the validated output (`TraceListFilters`), not a raw `Record<string, string>`.
- On failure, throw `BadRequestError` from the `zValidator` hook so `onError` still returns `{ error: message }`. Do not return Zod’s default body.
- Empty query strings are absent (`""` → `undefined`). Missing `limit` defaults in the schema.

### Data flow — ingest

```
POST /v1/traces
  → ingest/routes (bodyLimit)
  → ingest/services/ingest.ts
  → providers/otlp/json | otlp/proto (gzip decode, content-type match → records)
  → traces/services/store → traces/repositories → SQLite
```

### Data flow — read

```
GET /api/traces
  → traces/routes → traces/services/list → traces/repositories → SQLite
```

### Error handling

Services throw domain errors. They never build an HTTP `Response`.

- Use `shared/errors` (`AppError` and subclasses). Add a subclass there only if a new status is reused by 2+ features.
- Do **not** `return c.json({ error }, 4xx)` from a route or service — that bypasses the mapper and mixes two styles.
- Default: throw and let it bubble to `app.onError` (`{ error: message }` + status; unexpected → 500).
- Catch in the **HTTP handler** only when `onError` cannot produce the right body. The service still just throws.
- `zValidator` hooks throw `BadRequestError` — they do not `return c.json(...)`.

SQLite is a single writer. `shared/db/client.ts` serializes all work through `run(fn)`.

### Where does new code go?

| Task | Location |
| --- | --- |
| Trace list/detail DTO | `features/traces/types/dto.ts` |
| Trace SQL | `features/traces/repositories/` |
| Trace store / summary rules | `features/traces/services/store.ts` + `helpers/` |
| Ingest provider helpers (decode, media-type) | `features/ingest/providers/shared/` |
| OTLP helpers (ids, values, paths) | `features/ingest/providers/otlp/helpers/` |
| OTLP mappers | `features/ingest/providers/otlp/mappers/` |
| OTLP JSON / protobuf | `features/ingest/providers/otlp/json/` / `otlp/proto/` |
| New ingest protocol | `features/ingest/providers/<name>/` |
| HTTP route | `features/<name>/routes.ts` (relative paths) + prefix in `app.ts` |
| List query schema | `features/<name>/services/list.ts` (`export const query`) + `zValidator` in `routes.ts` |
| HTTP DTO mapping | the list service file until a second caller needs it (`helpers/` after that) |
| Shared helpers | `src/shared/helpers/` |
| Schema migration | `apps/api/src/shared/db/sql/` + register in `shared/db/migrate.ts` |
| App config | `src/config.ts` |

## SQLite schema migrations

Migrations are versioned SQL files applied sequentially at startup (and via `just migrate`). Version is tracked in `schema_meta.version`.

```
apps/api/src/shared/db/
  client.ts
  migrate.ts
  cli.ts
  helpers/
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
- **All DDL goes in `apps/api/src/shared/db/sql/`**. Register numbered migrations in `MIGRATIONS` in `shared/db/migrate.ts`.
- **Never edit a migration that has already been applied** to a DB you care about. Add a new numbered file instead.
- **Never write backfills.** New/changed columns only need to be populated for **newly ingested** data. When existing rows must reflect a schema/logic change during dev, **wipe the DB and restart**.
- **During local dev**, if you need to re-run from scratch: delete `./data/local-tracer.db`, edit the migration SQL, restart.
- Migrations must be **sequential** (v1, v2, v3…). The runner rejects gaps.
- Each `.sql` file can contain multiple statements separated by `;`. Do not put semicolons inside string literals.
- `schema_meta` is managed by the runner — do not create or modify it in migration files.

### Running migrations

Pending migrations apply when the API opens the database. To run them without starting the server:

```
just migrate
# or: pnpm --filter @local-tracer/api migrate
  → bun src/shared/db/cli.ts → migrateDb() → initSchema()
```

Boot path:

```
bun src/index.ts   # or just dev / pnpm --filter @local-tracer/api dev
  → openDb() → initSchema()
```

- **Database path:** `LT_DATABASE_PATH` env var, default `./data/local-tracer.db`.
- **Pending migrations** apply on startup; already-applied ones are skipped (idempotent).
- **Verify** with sqlite3 against the live file (WAL allows concurrent readers):

```bash
sqlite3 ./data/local-tracer.db "SELECT version FROM schema_meta;"
sqlite3 ./data/local-tracer.db "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

Expected on a fresh DB: `schema_meta.version = 4`, tables `logs`, `metrics`, `schema_meta`, `spans`, `traces`.

### Adding a migration

1. Create `apps/api/src/shared/db/sql/00N_<name>.sql`.
2. Append an entry to `MIGRATIONS` in `shared/db/migrate.ts`.
3. Restart the API (or `just migrate`).

### Changing schema in dev (wipe + edit)

1. Stop the API.
2. Delete or move `./data/local-tracer.db`.
3. Edit the migration SQL.
4. Restart — migrations run on a fresh DB.

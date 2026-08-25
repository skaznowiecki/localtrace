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
  features/time-range/  # app-wide live/lookback (provider + header)
  components/           # product display used by 2+ features
  components/ui/        # shared primitives only (shadcn + list chrome)
  routes/               # thin route shells → import from features
  lib/                  # shared utils (json, api, brand-catalog, colors)
```

### Rules

- New UI/logic lives in `features/<name>/`, not in `routes/`.
- Routes only wire URL → feature. No business logic in route files.
- `components/ui/` is shared primitives only — never feature-specific code.
- `components/` (outside `ui/`) is product display used by 2+ features (`ServiceBadge`, `AttributeTree`, brand icons).
- Prefer colocation: keep a feature's pieces together; extract to shared only when reused by 2+ features.
- Features do not import other features. Shared code goes to `lib/`, `components/ui/`, `components/`, or `features/time-range`.
- **Interactive elements get `cursor-pointer`.** Any control with an action (buttons, toggles, collapsible triggers, clickable rows, expand/collapse chevrons, links that act as buttons) must use `cursor-pointer`. Prefer putting it on shared primitives (`Button`, `Toggle`, `CollapsibleTrigger`, …) so feature code inherits it; add it explicitly on custom `<button>` / clickable surfaces.

### Span overview strategies (`features/traces`)

Custom Overview panels for known span types. The **API** classifies (`type` + `payload_path`); Overview **matches `span.type`**, it does not re-parse attributes.

```
apps/api/src/features/traces/helpers/span-type/
  resolve.ts            # classify() — first-match
  detectors/
    index.ts            # ordered registry (more specific first)
    redis.ts / mongo.ts / sql.ts / prisma.ts / s3.ts / openrouter.ts / trpc.ts / express.ts / http.ts

apps/web/src/features/traces/components/span-overview/
  types.ts              # SpanOverviewStrategy { id, match, render }
  resolve.ts            # first-match resolver
  KvRow.tsx             # shared label/value row
  OverviewSection.tsx   # collapsible wrapper
  strategies/
    index.ts            # ordered registry (first match wins)
    sql.tsx             # postgres / mysql / sqlite / sql
    clickhouse.tsx      # clickhouse (often no db.statement — Datadog omits the SQL)
    prisma.tsx / redis.tsx / mongo.tsx / s3.tsx / openrouter.tsx / trpc.tsx / express.tsx / http.tsx
```

**How to add a type**

1. API: `helpers/span-type/detectors/<id>.ts` — `match` via semantic attributes (not `span.kind`); return `{ type, payloadPath? }`. Register in `detectors/index.ts` (more specific first).
2. Web: `span-overview/strategies/<id>.tsx` — `match: (span) => span.type === "<id>"`. Register in `strategies/index.ts`.
3. Do not change `SpanDto` shape (`type` + `payload_path` stay generic).

Current detector order: redis → mongo → sql → prisma → s3 → openrouter → trpc → express → http.

**Rules**

- When a strategy matches, `TraceSpanDetails` collapses **Span Attributes** by default.
- Attribute-value strategies (`attribute-value/strategies/`) are separate — they style leaf string values in the tree, not the Overview layout.

### HTTP display badges (`features/traces`)

Shared presentational badges for HTTP method and status code. Use these everywhere those values appear — do **not** inline color classes.

```
features/traces/components/
  HttpMethodBadge.tsx       # GET / POST / … colored verb badge
  HttpStatusCodeBadge.tsx   # 200 / 404 / 500 … colored status badge
  HttpPath.tsx               # path / URL (origin muted on absolute URLs)
```

**Rules**

- Method verbs → `HttpMethodBadge` (list name, drawer header, span details, HTTP overview).
- Status codes → `HttpStatusCodeBadge` (list Status column, drawer header, span details, HTTP overview).
- Paths / URLs → `HttpPath`.
- List Status column prefers `HttpStatusCodeBadge` when `trace.httpStatusCode` is set; otherwise falls back to `TraceStatusBadge` (ok/error/unset).
- Do **not** N+1-fetch `/api/traces/{id}` to enrich the list. Detail is loaded only when the drawer opens (`useTraceDetail`). List `httpStatusCode` comes from the list API when present; otherwise show `TraceStatusBadge`.

### tRPC display (`features/traces`)

tRPC procedures arrive as generic `trpc.procedure` spans. Classify via `rpc.system` / `trpc.path`, then show the procedure path — never the raw span name.

```
features/traces/components/display/TrpcTypeBadge.tsx   # query / mutation / subscription
features/traces/lib/trpc-spans.ts                      # extractTrpcSpanMeta / trpcProcedureLabel
```

**Rules**

- Procedure type → `TrpcTypeBadge` (waterfall stats, drawer header, tRPC overview).
- Waterfall / stats labels use `trpc.path` (via `spanDisplayLabel`), not `trpc.procedure`.
- Overview matches `span.type === "trpc"` from the API detector.

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
- A feature may depend on `components/ui`, `components/` (shared product display), `lib`, `features/time-range`, and its own files. It should **not** import from another feature's internals — if two features share code, lift it to `lib/` (utils), `components/ui` (primitives), or `components/` (product display).
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
- Don't put context at the app root unless the state is truly global (theme, auth, live/lookback). Feature state stays inside the feature. App-wide live/lookback lives in `features/time-range` and is mounted from `routes/__root`.
- If only 2–3 components need it and they're close, lift state up instead of adding context.
- Never export a raw `Context` object — always expose a `useXContext()` hook that throws if used outside its provider.

## How each piece maps

| Need | Goes in |
| --- | --- |
| Screen/URL wiring | `routes/` (thin shell) |
| Feature UI | `features/<f>/components/` |
| Data fetching / logic | `features/<f>/hooks/` + `api/` |
| Cross-component feature state | `features/<f>/context/` |
| App-wide live/lookback | `features/time-range/` |
| Product display used by 2+ features | `components/` (e.g. `ServiceBadge`, `AttributeTree`) |
| Reusable primitive (button, input, sortable head) | `components/ui/` |
| Generic helper (formatting, cn, parseJson, brands) | `lib/` |
| Truly global state | app-level provider in `routes/__root` |

## Backend stack (`apps/api`)

- Bun + TypeScript
- Hono
- SQLite via `bun:sqlite`
- OTLP HTTP (`POST /v1/traces|logs|metrics`) JSON and protobuf (gzip optional)
- OTLP gRPC (`:4317`) TraceService / LogsService / MetricsService `Export`

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
    traces/             list GET + store (called by ingest) + tools/
    logs/               list-by-trace GET + store + tools/
    metrics/            store + HTTP GET / + /facets + MCP read tools (no web UI)
    catalog/            GET /api/services + tools/
    ingest/             OTLP + Sentry + Datadog providers + ingest service
    mcp/                Streamable HTTP /mcp — registers each feature's tools/
```

### Feature anatomy (API)

```
features/traces/
  types/            records + HTTP DTOs (no logic)
  repositories/     SQL only
  helpers/          store rules (trace-status) + span-type classifiers + DTO mapping (card)
  schemas/          Zod for that service (`query` / `param` HTTP, `input` MCP)
  services/         list.ts / facets.ts / with-spans.ts / sql.ts + store.ts
  tools/            MCP tools, resources, prompts, examples — calls execute
  routes.ts         HTTP only
  index.ts          routes + public store + tools
```

**Rules**

- SQL lives in `repositories/`. Services call repos, not SQLite.
- `routes.ts` calls services, not repos. List services return HTTP DTOs. Keep Record → DTO in the service file until a second caller needs it.
- HTTP input (query, params, body) goes through `zValidator` + `c.req.valid(...)`. Never parse `c.req.query()` / `c.req.param()` by hand.
- Zod lives in `schemas/<role>.ts`, one file per service. Services and tools do not define schemas.
- Ingest does **not** have repositories. `features/ingest/services/ingest.ts` parses via a **provider** and calls `traces/logs/metrics` store.
- Extract to `src/shared/` only when 2+ features use it (`db`, `helpers`, `errors`).
- Trace summary rules (`trace-status`) live in `traces/helpers/`. List services are one `execute` per file (`list.ts`, `facets.ts`, `with-spans.ts`, `overview.ts`, `span.ts`, `sql.ts`, `search.ts`, `spans-by-type.ts`).
- Import another feature only through its `index.ts`.
- Agent surface lives in `features/<name>/tools/` (`register(server, db)`). `services/` stay execute-only. `features/mcp` only mounts `/mcp` and calls each feature's `tools.register`. `store` / ingest have no `tools/`.
- MCP is agent-first: server `instructions` encode the playbook; `get_trace` defaults to overview; lists return `{ items, total, offset, limit, next_offset }`; prefer `since_minutes`. Do not register a raw SQLite MCP beside it.

### MCP playbook (for agents using `/mcp`)

1. `list_facets` / `list_log_facets` / `list_metric_facets` before inventing filter values.
2. Prefer `since_minutes` over RFC3339 `since`.
3. Do not call `get_trace` in a loop over `list_traces`.
4. `get_trace` is overview (no attributes). `get_span` for attributes; `get_trace_spans` / `get_trace_sql` for typed payloads; `get_trace_logs` for logs.
5. `breakdown: null` means still processing — retry `get_trace`.

### Ingest providers

Each ingest protocol is a provider. Request plumbing any protocol would reuse lives in `providers/shared/`. A protocol’s data model stays under `providers/<name>/`. Providers must not import each other.

```
features/ingest/providers/
  shared/           request plumbing (decode, media-type, …)
  errors.ts
  types.ts
  resolve.ts        first-match registry
  <protocol>/
    helpers/        that protocol’s data model only
    mappers/        protocol payload → records
```

**Rules**

- **Shared** = the HTTP request (body bytes, encoding, content-type, size). Not IDs, timestamps, or attributes of a protocol.
- **Protocol-specific** = that protocol’s payload shape. New protocol → new `providers/<name>/` + register in `resolve.ts` (more specific first). Reuse `providers/shared/`; do not import another protocol.
- Wire formats of the same protocol (JSON vs protobuf, …) are siblings under that protocol’s folder.
- **Tests required.** New protocol (or a wire format the SDK actually sends) is not done until `apps/api/tests/ingest/<name>.test.ts` covers the HTTP loop: ingest `200` → `GET /api/traces/:id` (provider, type, overlay) → `?raw=true`. Add logs/metrics cases when the protocol emits them. Vitest only; do **not** colocate `*.test.ts` under `providers/<name>/`.

### Naming

Name by **role**, not by restating the module. The file/feature already scopes the noun — don't repeat it in the function (`repo.bulkCreate`, not `repo.insertLogs`).

#### Services

A service file exposes **one** public function: `execute`. The file name is the role.

```ts
import * as list from "./services/list"
import * as listSchema from "./schemas/list"
await list.execute(db, c.req.valid("query"))
```

Not `list.list`, not `listService`, not `withSpans.withSpans`.

If a file would need two public functions, split it (`list.ts` / `facets.ts` / `with-spans.ts` / `sql.ts`). Private helpers in the same file are fine (Record → DTO). **No Zod in the service.** Input schemas live in `schemas/<same-name>.ts`.

Write services live in `store.ts` and also export `execute`. The feature `index.ts` re-exports `{ execute as store }` so other features call `store(...)`.

`ingest.ts` is the exception: one file, three signals (`ingestTraces` / `ingestLogs` / `ingestMetrics`). Do not cram unrelated reads into one service file the same way. Mixed-signal envelopes use `services/envelope.ts` (`execute`).

#### Schemas

One file per service that takes input: `schemas/list.ts` next to `services/list.ts`. Same role name.

```
features/traces/schemas/
  list.ts           query (HTTP) + input (MCP) + filters()
  with-spans.ts     param (HTTP) + input (MCP)
  sql.ts
  facets.ts         input (empty object)
```

```ts
import * as listSchema from "./schemas/list"

app.get("/", zValidator("query", listSchema.query, onInvalid), async (c) => {
  return c.json(await list.execute(c.get("db"), c.req.valid("query")))
})

server.registerTool("list_traces", { inputSchema: listSchema.input }, async (args) =>
  jsonResult(() => list.execute(db, listSchema.filters(args))),
)
```

**Rules**

- `query` / `param` / `body` = HTTP encodings (query strings, route params).
- `input` = MCP / typed caller (numbers, `.describe()`).
- Mappers (`filters`) live in the schema file, not in the service or the tool.
- Routes and tools import `schemas/`, never define Zod inline.
- Lift to `shared/helpers` only when 2+ features need the same schema (`traceId`, `traceIdParam`).
- `store` has no `schemas/` file (ingest records, not HTTP/MCP input).

#### Repositories

A repository file has many queries. Methods are role verbs: `list` / `get` / `create` / `bulkCreate` / `upsert` / `forTrace` / `facets` / `rebuild`.

Not `listTraces`, not `insertLogs`, not `loadTraceRebuildRows`. Prefix only when the file owns two tables (`upsertSpans` vs `upsert`).

#### Routes

`routes()` at the feature root (not `logsRoutes` in `http/`). HTTP only.

**Mount sub-apps with a prefix.** The sub-app declares relative paths (`/`, `/:id`), never the full URL. Compose in `app.ts`:

```
app.route("/mcp", mcp)                 // ALL /
app.route("/api/logs", logsList)    // GET /, GET /facets
app.route("/api/metrics", metrics)  // GET /, GET /facets (no web UI)
app.route("/api/traces", logs)      // GET /:id/logs
app.route("/api/traces", traces)    // GET /, GET /facets, GET /:id/sql, GET /:id
app.route("/api/services", catalog) // GET /
app.route("/api", ingest envelope)  // POST /:projectId/envelope
app.route("/v1", ingest)            // POST /traces, /logs, /metrics
```

Not `app.route("/", routes())` with absolute paths (`/api/traces/:id`). That duplicates prefixes, weakens `c.req.param()` inference, blocks RPC/`hc`, and skips the sub-app `notFound`. When two features share a prefix, mount the more specific sub-app first (`/:id/logs` before `/:id`).

The **callee owns its details**. Callers pass the minimum; encoding, limits, and other request concerns stay inside the owner (`provider.decode(raw)`, not pre-resolved gzip/maxBytes).

#### Validation

All input validation is Zod. No hand-rolled checks (`if (value.length !== 32)`, regex + `throw`, custom `XError` for bad input, `c.req.query()` / `c.req.param()` by hand).

- **HTTP** (query, params, body): `@hono/zod-validator` + `c.req.valid(...)`. The schema lives in `schemas/<role>.ts` (`export const query` / `param`) or `shared/helpers` when 2+ features share it. The route only wires the validator.

```ts
import * as listSchema from "./schemas/list"

app.get("/", zValidator("query", listSchema.query, onInvalid), async (c) => {
  return c.json(await list.execute(c.get("db"), c.req.valid("query")))
})
```

- On HTTP failure, `onInvalid` (`shared/errors`) throws `BadRequestError` from the first Zod issue. Do not return Zod’s default body.
- **Everywhere else** (ingest payloads, IDs, encodings): `schema.parse` (required) or `schema.safeParse` (optional / skip-invalid). Convert `ZodError` to a domain error only at the HTTP/ingest boundary.
- Defaults and “empty means absent” (`""` → `undefined`) belong in the schema, not in `if` guards around it.
- `execute` receives already-validated output, not a raw `Record<string, string>`.

### Data flow — ingest

```
POST /v1/traces
  → ingest/routes (bodyLimit)
  → ingest/services/ingest.ts
  → providers/otlp/json | otlp/proto (gzip decode, content-type match → records)
  → traces/services/store → traces/repositories → SQLite

gRPC :4317  TraceService|LogsService|MetricsService/Export
  → ingest/providers/otlp/grpc (HTTP/2 + 5-byte frame)
  → providers/otlp/proto/parse → store
  (gRPC against :4318 → 415 hint; not a Hono provider)

POST /api/:projectId/envelope
  → ingest/envelope routes (bodyLimit)
  → ingest/services/envelope.ts
  → providers/sentry (envelope parse → traces + logs)
  → traces/logs store → SQLite

PUT|POST /v0.4/traces  (also /v0.3 /v0.5 /v0.7; GET /info)
  → mountAgent on parent app (bodyLimit)
  → ingest/services/ingest.ts
  → providers/datadog/json | datadog/msgpack
  → traces/services/store → traces/repositories → SQLite

POST /v1/input  POST /api/v2/logs  POST /api/v1/series
  → ingest /v1 or /api routes (bodyLimit)
  → providers/datadog/logs | datadog/metrics
  → logs/metrics store → SQLite
```

### Data flow — read

```
GET /api/traces
  → traces/routes → traces/services/list → traces/repositories → SQLite

GET /api/traces/:id
  → traces/routes → traces/services/with-spans (classify type + payload_path) → repositories → SQLite

GET /api/traces/:id/sql
  → traces/routes → traces/services/sql → traces/repositories → SQLite

GET /api/metrics  GET /api/metrics/facets
  → metrics/routes → query / facets → repositories → SQLite
  (no web UI — ingest + HTTP + MCP only)

POST /mcp
  → mcp/routes → traces|logs|metrics|catalog tools.register → services/execute → SQLite
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
| Span type classifier | `features/traces/helpers/span-type/` (detector + Overview strategy) |
| Trace SQL | `features/traces/repositories/` |
| Trace store / summary rules | `features/traces/services/store.ts` + `helpers/` |
| Ingest provider helpers (decode, media-type) | `features/ingest/providers/shared/` |
| OTLP helpers (ids, values, paths) | `features/ingest/providers/otlp/helpers/` |
| OTLP mappers | `features/ingest/providers/otlp/mappers/` |
| OTLP JSON / protobuf | `features/ingest/providers/otlp/json/` / `otlp/proto/` |
| OTLP gRPC (`:4317`) | `features/ingest/providers/otlp/grpc/` (not a Hono provider) |
| Sentry envelope | `features/ingest/providers/sentry/` |
| Datadog Agent HTTP | `features/ingest/providers/datadog/` |
| New ingest protocol | `features/ingest/providers/<name>/` |
| HTTP route | `features/<name>/routes.ts` (relative paths) + prefix in `app.ts` |
| Validation schema | `features/<name>/schemas/<role>.ts` (`query` / `param` / `input`); `shared/helpers` if 2+ features; `zValidator` in `routes.ts` |
| HTTP DTO mapping | the list service file until a second caller needs it (`helpers/` after that) |
| MCP tool / resource / prompt | `features/<name>/tools/` (`register`); HTTP mount in `features/mcp` |
| Shared helpers | `src/shared/helpers/` |
| Schema migration | `apps/api/src/shared/db/sql/` + register in `shared/db/migrate.ts` |
| App config | `src/config.ts` |

## SQLite schema migrations

Migrations are versioned SQL files applied sequentially at startup. Version is tracked in `schema_meta.version`. `just migrate` always wipes the local DB and recreates it.

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
```

### No backwards compatibility

This is a **local-only** tracer. Data is disposable. **Never** design for old rows, old columns, or old API shapes.

- **`just migrate` wipes and recreates.** It deletes `LT_DATABASE_PATH` (and `-wal` / `-shm`) then applies `001_*.sql` from scratch. Do this for any schema or denormalized-field change. Do not `rm` the DB files by hand.
- **Edit `001_*.sql` in place.** Do not add `002_…` / extra columns / dual fields just to keep existing DBs working (`http_url` path + `http_full_url`, optional DTO leftovers, frontend `??` fallbacks for missing ingest fields).
- **No backfills. No dual-write. No compat DTOs.** Change the field meaning, update callers, wipe.
- After a wipe, expected: `schema_meta.version = 1`, tables `logs`, `metrics`, `schema_meta`, `spans`, `traces`.

```
just migrate
```

### Rules

- **`just migrate` always wipes and recreates the DB.** Never `rm` the SQLite files by hand. Stop the API first if it is running.
- **All DDL goes in `apps/api/src/shared/db/sql/`**. Register files in `MIGRATIONS` in `shared/db/migrate.ts`.
- Migrations must be **sequential** (v1, v2, …). The runner rejects gaps. Prefer a single v1 while this stays a local app.
- Each `.sql` file can contain multiple statements separated by `;`. Do not put semicolons inside string literals.
- `schema_meta` is managed by the runner — do not create or modify it in migration files.

### Running migrations

`just migrate` always deletes the local DB and recreates it. Stop the API first if it is running.

```
just migrate
  → rm LT_DATABASE_PATH (+ -wal / -shm)
  → bun src/shared/db/cli.ts → migrateDb() → initSchema()
```

Boot path (applies pending migrations only; does **not** wipe):

```
bun src/index.ts   # or just dev / pnpm --filter @local-tracer/api dev
  → openDb() → initSchema()
```

- **Database path:** `LT_DATABASE_PATH` env var, default `./data/local-tracer.db`.
- **`just migrate`:** always wipe + recreate. Data is discarded; re-ingest after.
- **API boot / `pnpm --filter @local-tracer/api migrate`:** apply pending versions only; already-applied ones are skipped.
- **Verify** with sqlite3 against the live file (WAL allows concurrent readers):

```bash
sqlite3 ./data/local-tracer.db "SELECT version FROM schema_meta;"
sqlite3 ./data/local-tracer.db "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

### Changing schema

1. Stop the API.
2. Edit `001_*.sql` (and types / store / DTOs to match).
3. `just migrate` — wipes the DB and recreates schema.
4. Restart. Re-ingest.

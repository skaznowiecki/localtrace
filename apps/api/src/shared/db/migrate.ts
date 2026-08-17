import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { DbConn } from "./client"

type Migration = {
  version: number
  name: string
  files: string[]
}

const SQL_DIR = join(import.meta.dir, "sql")

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "initial",
    files: ["001_spans.sql", "001_traces.sql", "001_logs.sql", "001_metrics.sql"],
  },
  {
    version: 2,
    name: "trace_http",
    files: ["002_trace_http.sql"],
  },
  {
    version: 3,
    name: "trace_http_url",
    files: ["003_trace_http_url.sql"],
  },
  {
    version: 4,
    name: "trace_http_route",
    files: ["004_trace_http_route.sql"],
  },
]

async function execScript(conn: DbConn, sql: string): Promise<void> {
  for (const statement of sql.split(";")) {
    const trimmed = statement.trim()
    if (!trimmed) continue
    await conn.run(trimmed)
  }
}

async function currentVersion(conn: DbConn): Promise<number> {
  const countRows = await conn.all("SELECT COUNT(*) AS n FROM schema_meta")
  const count = Number(countRows[0]?.n ?? 0)
  if (count === 0) return 0

  const verRows = await conn.all("SELECT version FROM schema_meta LIMIT 1")
  return Number(verRows[0]?.version ?? 0)
}

async function setVersion(conn: DbConn, version: number): Promise<void> {
  const countRows = await conn.all("SELECT COUNT(*) AS n FROM schema_meta")
  const count = Number(countRows[0]?.n ?? 0)
  if (count === 0) {
    await conn.run("INSERT INTO schema_meta (version) VALUES (?)", [version])
  } else {
    await conn.run("UPDATE schema_meta SET version = ?", [version])
  }
}

async function assertNotLegacySchema(conn: DbConn): Promise<void> {
  const tables = await conn.all(
    `SELECT COUNT(*) AS n FROM sqlite_master
     WHERE type = 'table' AND name = 'traces'`,
  )
  if (Number(tables[0]?.n ?? 0) === 0) return

  const cols = await conn.all(
    `SELECT COUNT(*) AS n FROM pragma_table_info('traces') WHERE name = 'id'`,
  )
  if (Number(cols[0]?.n ?? 0) > 0) {
    throw new Error(
      "legacy MVP database schema detected (traces.id column). Delete or move ./data/local-tracer.db and restart.",
    )
  }
}

export async function initSchema(
  conn: DbConn,
): Promise<{ from: number; to: number }> {
  await assertNotLegacySchema(conn)
  await conn.run(
    "CREATE TABLE IF NOT EXISTS schema_meta (version INTEGER NOT NULL)",
  )

  const from = await currentVersion(conn)
  let current = from
  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue
    if (migration.version !== current + 1) {
      throw new Error(
        `missing migration ${current + 1} (db at v${current}, next expected v${current + 1})`,
      )
    }
    for (const file of migration.files) {
      const sql = await readFile(join(SQL_DIR, file), "utf8")
      try {
        await execScript(conn, sql)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        throw new Error(
          `migration ${migration.version} (${migration.name}) ${file}: ${message}`,
        )
      }
    }
    await setVersion(conn, migration.version)
    current = migration.version
  }
  return { from, to: current }
}

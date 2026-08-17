import { Database } from "bun:sqlite"
import { mkdir } from "node:fs/promises"
import { dirname } from "node:path"
import { initSchema } from "./migrate"

export type SqlValue = null | boolean | number | bigint | string

export type DbConn = {
  run(sql: string, params?: SqlValue[]): Promise<void>
  all(sql: string, params?: SqlValue[]): Promise<Record<string, unknown>[]>
}

export type Db = {
  run<T>(fn: (conn: DbConn) => Promise<T>): Promise<T>
  close(): void
}

function bindParams(params?: SqlValue[]): SqlValue[] | undefined {
  if (!params) return undefined
  return params.map((value) =>
    typeof value === "boolean" ? (value ? 1 : 0) : value,
  )
}

function isNotADatabase(err: unknown): boolean {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: unknown }).code
    if (code === "SQLITE_NOTADB" || code === 26) return true
  }
  const message = err instanceof Error ? err.message : String(err)
  return /not a database/i.test(message)
}

function wrapConn(sqlite: Database): DbConn {
  return {
    async run(sql, params) {
      const bindings = bindParams(params)
      if (bindings && bindings.length > 0) {
        sqlite.run(sql, bindings)
      } else {
        sqlite.run(sql)
      }
    },
    async all(sql, params) {
      const stmt = sqlite.query(sql)
      const bindings = bindParams(params)
      const rows =
        bindings && bindings.length > 0 ? stmt.all(...bindings) : stmt.all()
      return rows as Record<string, unknown>[]
    },
  }
}

function openSqlite(databasePath: string): Database {
  try {
    const sqlite = new Database(databasePath, { create: true, safeIntegers: true })
    sqlite.run("PRAGMA journal_mode = WAL")
    sqlite.run("PRAGMA busy_timeout = 5000")
    sqlite.run("PRAGMA synchronous = NORMAL")
    sqlite.run("PRAGMA foreign_keys = ON")
    return sqlite
  } catch (err) {
    if (!isNotADatabase(err)) throw err
    throw new Error(
      `existing database is not SQLite (likely leftover DuckDB). Delete ${databasePath} (and .wal / -wal / -shm) and restart.`,
    )
  }
}

async function createDb(databasePath: string): Promise<Db> {
  const parent = dirname(databasePath)
  if (parent && parent !== ".") {
    await mkdir(parent, { recursive: true })
  }

  const sqlite = openSqlite(databasePath)
  const conn = wrapConn(sqlite)

  let queue: Promise<unknown> = Promise.resolve()
  const run = <T>(fn: (c: DbConn) => Promise<T>): Promise<T> => {
    const next = queue.then(() => fn(conn))
    queue = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }

  return {
    run,
    close() {
      sqlite.close()
    },
  }
}

export async function openDb(databasePath: string): Promise<Db> {
  const db = await createDb(databasePath)
  await db.run((conn) => initSchema(conn))
  return db
}

export async function migrateDb(
  databasePath: string,
): Promise<{ from: number; to: number }> {
  const db = await createDb(databasePath)
  try {
    return await db.run((conn) => initSchema(conn))
  } finally {
    db.close()
  }
}

import { Database } from "bun:sqlite"
import { initSchema } from "./migrate"

export type SqlValue = null | boolean | number | bigint | string

export type DbConn = {
  run(sql: string, params?: SqlValue[]): Promise<void>
  all(sql: string, params?: SqlValue[]): Promise<Record<string, unknown>[]>
}

export type Db = {
  run<T>(fn: (conn: DbConn) => Promise<T>): Promise<T>
  close(): Promise<void>
}

function wrapConn(sqlite: Database): DbConn {
  return {
    async run(sql, params) {
      if (params && params.length > 0) sqlite.run(sql, params)
      else sqlite.run(sql)
    },
    async all(sql, params) {
      const stmt = sqlite.query(sql)
      const rows = params && params.length > 0 ? stmt.all(...params) : stmt.all()
      return rows as Record<string, unknown>[]
    },
  }
}

function createDb(databasePath: string): Db {
  const sqlite = new Database(databasePath, {
    create: true,
    safeIntegers: true,
    strict: true,
  })
  sqlite.run("PRAGMA journal_mode = WAL")
  sqlite.run("PRAGMA busy_timeout = 5000")

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
      return run(async () => {
        sqlite.close()
      })
    },
  }
}

export async function openDb(databasePath: string): Promise<Db> {
  const db = createDb(databasePath)
  await db.run((conn) => initSchema(conn))
  return db
}

export async function migrateDb(
  databasePath: string,
): Promise<{ from: number; to: number }> {
  const db = createDb(databasePath)
  try {
    return await db.run((conn) => initSchema(conn))
  } finally {
    await db.close()
  }
}

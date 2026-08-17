import { DuckDBConnection, DuckDBInstance } from "@duckdb/node-api"
import { mkdir, rename, stat } from "node:fs/promises"
import { dirname } from "node:path"
import { initSchema } from "./migrate"

export type Db = {
  run<T>(fn: (conn: DuckDBConnection) => Promise<T>): Promise<T>
  close(): void
}

function walPathFor(dbPath: string): string {
  return `${dbPath}.wal`
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function quarantineWal(dbPath: string, reason: string): Promise<void> {
  const walPath = walPathFor(dbPath)
  if (!(await exists(walPath))) return

  const ts = Math.floor(Date.now() / 1000)
  const backup = `${walPath}.corrupt-${ts}`
  await rename(walPath, backup)
  console.warn(
    `quarantined unreplayable DuckDB WAL ${walPath} -> ${backup} (${reason})`,
  )
}

function isWalReplayFailure(message: string): boolean {
  return (
    message.includes("replaying WAL") ||
    message.includes("Failure while replaying WAL file")
  )
}

async function openInstance(dbPath: string): Promise<DuckDBInstance> {
  try {
    return await DuckDBInstance.create(dbPath)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (!isWalReplayFailure(message)) throw err
    await quarantineWal(dbPath, message)
    return DuckDBInstance.create(dbPath)
  }
}

export async function openDb(databasePath: string): Promise<Db> {
  const parent = dirname(databasePath)
  if (parent && parent !== ".") {
    await mkdir(parent, { recursive: true })
  }

  const instance = await openInstance(databasePath)
  const conn = await instance.connect()

  let queue: Promise<unknown> = Promise.resolve()

  const run = <T>(fn: (c: DuckDBConnection) => Promise<T>): Promise<T> => {
    const next = queue.then(() => fn(conn))
    queue = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }

  await run(async (c) => {
    await initSchema(c)
    await c.run("CHECKPOINT")
  })

  return {
    run,
    close() {
      conn.closeSync()
      instance.closeSync()
    },
  }
}

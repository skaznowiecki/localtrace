import type { DbConn } from "@shared/db"

export async function get(conn: DbConn, key: string): Promise<string | undefined> {
  const rows = await conn.all("SELECT value FROM settings WHERE key = ?", [key])
  const value = rows[0]?.value
  return typeof value === "string" ? value : undefined
}

export async function set(
  conn: DbConn,
  key: string,
  value: string,
): Promise<void> {
  await conn.run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  )
}

export async function pruneBefore(conn: DbConn, cutoffNs: bigint): Promise<void> {
  await conn.run("DELETE FROM spans WHERE start_time_ns < ?", [cutoffNs])
  await conn.run("DELETE FROM traces WHERE start_time_ns < ?", [cutoffNs])
  await conn.run("DELETE FROM logs WHERE time_ns < ?", [cutoffNs])
  await conn.run("DELETE FROM metrics WHERE time_ns < ?", [cutoffNs])
}

export async function clearTelemetry(conn: DbConn): Promise<void> {
  await conn.run("DELETE FROM spans")
  await conn.run("DELETE FROM traces")
  await conn.run("DELETE FROM logs")
  await conn.run("DELETE FROM metrics")
}

import type { DbConn } from "@shared/db"
import { toNumber } from "@shared/helpers"
import type { ServiceCard } from "../types/service"

export async function list(
  conn: DbConn,
): Promise<ServiceCard[]> {
  const rows = await conn.all(
    `SELECT COALESCE(root_service, 'unknown_service') as service, COUNT(*) as trace_count
     FROM traces
     GROUP BY COALESCE(root_service, 'unknown_service')
     ORDER BY trace_count DESC`,
  )
  return rows.map((row) => ({
    name: String(row.service),
    traceCount: toNumber(row.trace_count),
  }))
}

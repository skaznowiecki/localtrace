import type { DuckDBConnection } from "@duckdb/node-api"
import { toNumber } from "../../../lib/attrs"
import type { ServiceCard } from "../types/service"

export async function listServices(
  conn: DuckDBConnection,
): Promise<ServiceCard[]> {
  const reader = await conn.runAndReadAll(
    `SELECT COALESCE(root_service, 'unknown_service') as service, COUNT(*) as trace_count
     FROM traces
     GROUP BY COALESCE(root_service, 'unknown_service')
     ORDER BY trace_count DESC`,
  )
  return reader.getRowObjectsJS().map((row) => ({
    name: String(row.service),
    traceCount: toNumber(row.trace_count),
  }))
}

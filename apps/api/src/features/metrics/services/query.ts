import type { Db } from "@shared/db"
import { nsToRfc3339 } from "@shared/helpers"
import * as repo from "../repositories/metrics"
import type { MetricPointDto, MetricQueryFilters } from "../types/dto"

export async function execute(
  db: Db,
  filters: MetricQueryFilters,
): Promise<MetricPointDto[]> {
  const rows = await db.run((conn) => repo.query(conn, filters))
  return rows.map((row) => ({
    id: row.id,
    time: nsToRfc3339(row.timeNs),
    name: row.name,
    service: row.serviceName,
    value: row.value,
    count: row.count,
    sum: row.sum,
  }))
}

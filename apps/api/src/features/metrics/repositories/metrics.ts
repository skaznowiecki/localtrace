import type { DbConn, SqlValue } from "@shared/db"
import { INSERT_CHUNK, valuePlaceholders } from "@shared/db"
import type {
  MetricQueryFilters,
  MetricSortField,
  MetricSortOrder,
} from "../types/dto"
import type { MetricDataPoint } from "../types/metric"

const METRIC_COLUMNS = 30

function metricValues(point: MetricDataPoint): SqlValue[] {
  return [
    point.id,
    point.name,
    point.description ?? "",
    point.unit ?? "",
    point.metricType,
    point.aggregationTemporality ?? null,
    point.isMonotonic ?? null,
    JSON.stringify(point.metadata ?? null),
    point.serviceName,
    JSON.stringify(point.resourceAttributes ?? null),
    point.resourceDroppedAttributesCount,
    point.resourceSchemaUrl ?? "",
    point.scopeName ?? "",
    point.scopeVersion ?? "",
    JSON.stringify(point.scopeAttributes ?? null),
    point.scopeDroppedAttributesCount,
    point.scopeSchemaUrl ?? "",
    JSON.stringify(point.attributes ?? null),
    point.startTimeNs ?? null,
    point.timeNs,
    point.valueDouble ?? null,
    point.intValue ?? null,
    point.count ?? null,
    point.sum ?? null,
    point.min ?? null,
    point.max ?? null,
    JSON.stringify(point.exemplars ?? null),
    point.flags,
    JSON.stringify(point.data ?? {}),
    point.ingestProvider ?? "otlp",
  ]
}

export async function bulkCreate(
  conn: DbConn,
  points: MetricDataPoint[],
): Promise<void> {
  if (points.length === 0) return
  for (let i = 0; i < points.length; i += INSERT_CHUNK) {
    const chunk = points.slice(i, i + INSERT_CHUNK)
    await conn.run(
      `INSERT INTO metrics (
                        id, name, description, unit, metric_type, aggregation_temporality,
                        is_monotonic, metadata, service_name, resource_attributes,
                        resource_dropped_attributes_count, resource_schema_url,
                        scope_name, scope_version, scope_attributes, scope_dropped_attributes_count,
                        scope_schema_url, attributes, start_time_ns, time_ns,
                        value_double, int_value, count, sum, min, max, exemplars, flags, data,
                        ingest_provider
                    ) VALUES ${valuePlaceholders(chunk.length, METRIC_COLUMNS)}`,
      chunk.flatMap(metricValues),
    )
  }
}

export type MetricNameFacet = { name: string; count: number }
export type MetricServiceFacet = { service: string; count: number }

export async function nameFacets(conn: DbConn): Promise<MetricNameFacet[]> {
  const rows = await conn.all(
    `SELECT name AS name, count(*) AS n FROM metrics GROUP BY name ORDER BY n DESC, name`,
  )
  return rows.map((row) => ({
    name: String(row.name),
    count: Number(row.n),
  }))
}

export async function serviceFacets(
  conn: DbConn,
): Promise<MetricServiceFacet[]> {
  const rows = await conn.all(
    `SELECT COALESCE(NULLIF(service_name, ''), 'unknown_service') AS service, count(*) AS n
     FROM metrics GROUP BY service ORDER BY n DESC, service`,
  )
  return rows.map((row) => ({
    service: String(row.service),
    count: Number(row.n),
  }))
}

export type MetricPointRow = {
  id: string
  timeNs: bigint
  name: string
  serviceName: string
  value: number | null
  count: number | null
  sum: number | null
}

const SORT_SQL: Record<MetricSortField, string> = {
  date: "time_ns",
  name: "name COLLATE NOCASE",
  service: "service_name COLLATE NOCASE",
}

const ORDER_SQL: Record<MetricSortOrder, string> = {
  asc: "ASC",
  desc: "DESC",
}

function orderBy(filters: MetricQueryFilters): string {
  const col = SORT_SQL[filters.sort]
  const dir = ORDER_SQL[filters.order]
  if (filters.sort === "date") {
    return `ORDER BY ${col} ${dir} LIMIT ? OFFSET ?`
  }
  return `ORDER BY ${col} ${dir}, time_ns DESC LIMIT ? OFFSET ?`
}

export async function query(
  conn: DbConn,
  filters: MetricQueryFilters,
): Promise<MetricPointRow[]> {
  const conditions: string[] = []
  const params: SqlValue[] = []
  if (filters.name) {
    conditions.push("name = ?")
    params.push(filters.name)
  }
  if (filters.service === "unknown_service") {
    conditions.push("(service_name IS NULL OR service_name = '')")
  } else if (filters.service) {
    conditions.push("service_name = ?")
    params.push(filters.service)
  }
  if (filters.sinceNs != null) {
    conditions.push("time_ns >= ?")
    params.push(filters.sinceNs)
  }
  if (filters.untilNs != null) {
    conditions.push("time_ns <= ?")
    params.push(filters.untilNs)
  }
  const where =
    conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : ""
  params.push(filters.limit, filters.offset)
  const rows = await conn.all(
    `SELECT id, time_ns, name, service_name, value_double, int_value, count, sum
     FROM metrics${where} ${orderBy(filters)}`,
    params,
  )
  return rows.map((row) => {
    const valueDouble =
      row.value_double == null ? null : Number(row.value_double)
    const intValue = row.int_value == null ? null : Number(row.int_value)
    return {
      id: String(row.id),
      timeNs: BigInt(row.time_ns as bigint | number | string),
      name: String(row.name),
      serviceName: String(row.service_name ?? ""),
      value: valueDouble ?? intValue,
      count: row.count == null ? null : Number(row.count),
      sum: row.sum == null ? null : Number(row.sum),
    }
  })
}

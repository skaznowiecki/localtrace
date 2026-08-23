import type { DbConn, SqlValue } from "@shared/db"
import { INSERT_CHUNK, valuePlaceholders } from "@shared/db"
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

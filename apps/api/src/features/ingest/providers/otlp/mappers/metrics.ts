import { toBigInt, toNumber } from "../../../../../lib/attrs"
import type { Json } from "../../../../../lib/attrs"
import type { MetricDataPoint } from "../../../../metrics/types/metric"
import { keyValuesToJson, serviceNameFromResource } from "../values"

function asList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : []
}

function numberPair(point: Record<string, unknown>): {
  valueDouble?: number
  intValue?: bigint
} {
  const asDouble = point.asDouble ?? point.as_double
  const asInt = point.asInt ?? point.as_int
  if (asDouble != null) return { valueDouble: Number(asDouble) }
  if (asInt != null) return { intValue: toBigInt(asInt) }
  return {}
}

function basePoint(
  extra: Omit<MetricDataPoint, "id">,
): MetricDataPoint {
  return { id: crypto.randomUUID(), ...extra }
}

export function mapMetricRequest(request: Record<string, unknown>): MetricDataPoint[] {
  const out: MetricDataPoint[] = []
  const resourceMetrics = asList(request.resourceMetrics ?? request.resource_metrics)

  for (const rm of resourceMetrics) {
    const resource = (rm.resource ?? {}) as Record<string, unknown>
    const resourceAttributes = keyValuesToJson(resource.attributes)
    const resourceDropped = Number(
      resource.droppedAttributesCount ?? resource.dropped_attributes_count ?? 0,
    )
    const serviceName = serviceNameFromResource(resource.attributes)

    for (const sm of asList(rm.scopeMetrics ?? rm.scope_metrics)) {
      const scope = (sm.scope ?? {}) as Record<string, unknown>
      const scopeName = String(scope.name ?? "") || undefined
      const scopeVersion = String(scope.version ?? "") || undefined
      const scopeAttributes = keyValuesToJson(scope.attributes)
      const scopeDropped = Number(
        scope.droppedAttributesCount ?? scope.dropped_attributes_count ?? 0,
      )

      for (const metric of asList(sm.metrics)) {
        const shared = {
          name: String(metric.name ?? ""),
          description: String(metric.description ?? "") || undefined,
          unit: String(metric.unit ?? "") || undefined,
          metadata: keyValuesToJson(metric.metadata),
          serviceName,
          resourceAttributes,
          resourceDroppedAttributesCount: resourceDropped,
          scopeName,
          scopeVersion,
          scopeAttributes,
          scopeDroppedAttributesCount: scopeDropped,
        }

        const gauge = (metric.gauge ?? {}) as Record<string, unknown>
        const sum = (metric.sum ?? {}) as Record<string, unknown>
        const histogram = (metric.histogram ?? {}) as Record<string, unknown>
        const expHist = (metric.exponentialHistogram ??
          metric.exponential_histogram ??
          {}) as Record<string, unknown>
        const summary = (metric.summary ?? {}) as Record<string, unknown>

        if (metric.gauge) {
          for (const point of asList(gauge.dataPoints ?? gauge.data_points)) {
            const nums = numberPair(point)
            out.push(
              basePoint({
                ...shared,
                metricType: 1,
                attributes: keyValuesToJson(point.attributes),
                startTimeNs: toBigInt(point.startTimeUnixNano ?? point.start_time_unix_nano),
                timeNs: toBigInt(point.timeUnixNano ?? point.time_unix_nano),
                valueDouble: nums.valueDouble,
                intValue: nums.intValue,
                exemplars: keyValuesToJson([]),
                flags: Number(point.flags ?? 0),
                data: { gauge: point as Json },
              }),
            )
          }
        } else if (metric.sum) {
          for (const point of asList(sum.dataPoints ?? sum.data_points)) {
            const nums = numberPair(point)
            out.push(
              basePoint({
                ...shared,
                metricType: 2,
                aggregationTemporality: toNumber(
                  sum.aggregationTemporality ?? sum.aggregation_temporality,
                ),
                isMonotonic: Boolean(sum.isMonotonic ?? sum.is_monotonic),
                attributes: keyValuesToJson(point.attributes),
                startTimeNs: toBigInt(point.startTimeUnixNano ?? point.start_time_unix_nano),
                timeNs: toBigInt(point.timeUnixNano ?? point.time_unix_nano),
                valueDouble: nums.valueDouble,
                intValue: nums.intValue,
                exemplars: [],
                flags: Number(point.flags ?? 0),
                data: { sum: point as Json },
              }),
            )
          }
        } else if (metric.histogram) {
          for (const point of asList(histogram.dataPoints ?? histogram.data_points)) {
            out.push(
              basePoint({
                ...shared,
                metricType: 3,
                aggregationTemporality: toNumber(
                  histogram.aggregationTemporality ?? histogram.aggregation_temporality,
                ),
                attributes: keyValuesToJson(point.attributes),
                startTimeNs: toBigInt(point.startTimeUnixNano ?? point.start_time_unix_nano),
                timeNs: toBigInt(point.timeUnixNano ?? point.time_unix_nano),
                count: toBigInt(point.count),
                sum: point.sum != null ? Number(point.sum) : undefined,
                min: point.min != null ? Number(point.min) : undefined,
                max: point.max != null ? Number(point.max) : undefined,
                exemplars: [],
                flags: Number(point.flags ?? 0),
                data: { histogram: point as Json },
              }),
            )
          }
        } else if (metric.exponentialHistogram || metric.exponential_histogram) {
          for (const point of asList(expHist.dataPoints ?? expHist.data_points)) {
            out.push(
              basePoint({
                ...shared,
                metricType: 4,
                aggregationTemporality: toNumber(
                  expHist.aggregationTemporality ?? expHist.aggregation_temporality,
                ),
                attributes: keyValuesToJson(point.attributes),
                startTimeNs: toBigInt(point.startTimeUnixNano ?? point.start_time_unix_nano),
                timeNs: toBigInt(point.timeUnixNano ?? point.time_unix_nano),
                count: toBigInt(point.count),
                sum: point.sum != null ? Number(point.sum) : undefined,
                min: point.min != null ? Number(point.min) : undefined,
                max: point.max != null ? Number(point.max) : undefined,
                exemplars: [],
                flags: Number(point.flags ?? 0),
                data: { exponentialHistogram: point as Json },
              }),
            )
          }
        } else if (metric.summary) {
          for (const point of asList(summary.dataPoints ?? summary.data_points)) {
            out.push(
              basePoint({
                ...shared,
                metricType: 5,
                attributes: keyValuesToJson(point.attributes),
                startTimeNs: toBigInt(point.startTimeUnixNano ?? point.start_time_unix_nano),
                timeNs: toBigInt(point.timeUnixNano ?? point.time_unix_nano),
                count: toBigInt(point.count),
                sum: point.sum != null ? Number(point.sum) : undefined,
                exemplars: [],
                flags: Number(point.flags ?? 0),
                data: { summary: point as Json },
              }),
            )
          }
        }
      }
    }
  }

  return out
}

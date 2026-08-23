import type { Json } from "@shared/helpers"
import type { MetricDataPoint } from "@features/metrics/types/metric"
import { unixToNs } from "../helpers/time"
import { asList, asNumber, asRecord, asString, toJson } from "../helpers/values"

export function mapSeries(
  series: unknown[],
  version: 1 | 2,
): MetricDataPoint[] {
  const out: MetricDataPoint[] = []
  for (const item of series) {
    out.push(...mapOne(asRecord(item), version))
  }
  return out
}

function mapOne(
  series: Record<string, unknown>,
  version: 1 | 2,
): MetricDataPoint[] {
  const name = asString(series.metric) ?? asString(series.name)
  if (!name) return []
  const tags = tagMap(series.tags)
  const host = asString(series.host)
  const service = tags.service ?? host ?? "unnamed-service"
  const type = asString(series.type) ?? "gauge"
  const points = pointsOf(series.points, version)
  const attributes: { [key: string]: Json } = { ...tags }
  if (host) attributes.host = host
  attributes["datadog.type"] = type

  return points.map(([timeNs, value]) => ({
    id: crypto.randomUUID(),
    name,
    metricType: type === "count" || type === "rate" ? 2 : 1,
    metadata: {},
    serviceName: service,
    resourceAttributes: { "service.name": service },
    resourceDroppedAttributesCount: 0,
    scopeName: "datadog",
    scopeAttributes: {},
    scopeDroppedAttributesCount: 0,
    attributes,
    timeNs,
    valueDouble: value,
    exemplars: [],
    flags: 0,
    data: toJson(series) ?? {},
  }))
}

function tagMap(value: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  for (const tag of asList(value)) {
    if (typeof tag !== "string") continue
    const idx = tag.indexOf(":")
    if (idx <= 0) {
      out[tag] = "true"
      continue
    }
    out[tag.slice(0, idx)] = tag.slice(idx + 1)
  }
  return out
}

function pointsOf(
  value: unknown,
  version: 1 | 2,
): Array<[bigint, number]> {
  const out: Array<[bigint, number]> = []
  for (const point of asList(value)) {
    if (version === 2 && point && typeof point === "object" && !Array.isArray(point)) {
      const rec = asRecord(point)
      const ts = unixToNs(rec.timestamp)
      const val = asNumber(rec.value)
      if (val != null) out.push([ts, val])
      continue
    }
    if (Array.isArray(point) && point.length >= 2) {
      const ts = unixToNs(point[0])
      const val = asNumber(point[1])
      if (val != null) out.push([ts, val])
    }
  }
  return out
}

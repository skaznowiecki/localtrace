import { invalidPayload } from "../helpers/ids"
import { asList, asRecord } from "../helpers/values"
import { mapSeries } from "../mappers/metrics"
import type { MetricDataPoint } from "@features/metrics/types/metric"

export function parse(body: Uint8Array, version: 1 | 2): MetricDataPoint[] {
  const text = new TextDecoder().decode(body).trim()
  if (!text) return []
  try {
    const parsed = JSON.parse(text) as unknown
    const rec = asRecord(parsed)
    return mapSeries(asList(rec.series), version)
  } catch (err) {
    if (err && typeof err === "object" && "type" in err) throw err
    const message = err instanceof Error ? err.message : String(err)
    invalidPayload(`metrics decode failed: ${message}`)
  }
}

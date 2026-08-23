import { nsToRfc3339 } from "@shared/helpers"
import type { BreakdownDto, TraceCardDto } from "../types/dto"
import type { BreakdownItem, TraceSummary } from "../types/span"

export function card(trace: TraceSummary): TraceCardDto {
  const dto: TraceCardDto = {
    id: trace.traceId,
    service: trace.rootService || "unknown_service",
    root_service: trace.rootService || "unknown_service",
    name: trace.rootName || "unknown",
    duration_ms: Number(trace.durationNs / 1_000_000n),
    span_count: trace.spanCount,
    status: trace.status,
    start_time: nsToRfc3339(trace.startTimeNs),
    breakdown: toBreakdownDto(trace.breakdown),
  }
  if (trace.httpStatusCode != null) dto.http_status_code = trace.httpStatusCode
  if (trace.httpMethod) dto.http_method = trace.httpMethod
  if (trace.httpUrl) dto.http_url = trace.httpUrl
  if (trace.httpRoute) dto.http_route = trace.httpRoute
  return dto
}

function toBreakdownDto(items: BreakdownItem[] | null): BreakdownDto[] | null {
  if (items == null) return null

  const total = items.reduce((sum, item) => sum + item.durationNs, 0)
  return items.map((item) => ({
    name: item.name,
    duration_ms: item.durationNs / 1_000_000,
    share: total > 0 ? item.durationNs / total : 0,
  }))
}

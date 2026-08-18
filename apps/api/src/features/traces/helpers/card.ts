import { nsToRfc3339 } from "../../../shared/helpers"
import type { TraceCardDto } from "../types/dto"
import type { TraceSummary } from "../types/span"

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
  }
  if (trace.httpStatusCode != null) dto.http_status_code = trace.httpStatusCode
  if (trace.httpUrl) dto.http_url = trace.httpUrl
  return dto
}

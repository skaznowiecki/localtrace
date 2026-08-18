import { optionalOtlpId } from "../helpers/ids"
import { toBigInt } from "../../../../../shared/helpers"
import type { LogRecord } from "../../../../logs/types/log"
import { anyValueToJson, keyValuesToJson, serviceNameFromResource } from "../helpers/values"

function asList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : []
}

export function mapLogRequest(request: Record<string, unknown>): LogRecord[] {
  const out: LogRecord[] = []
  const resourceLogs = asList(request.resourceLogs ?? request.resource_logs)

  for (const rl of resourceLogs) {
    const resource = (rl.resource ?? {}) as Record<string, unknown>
    const resourceAttributes = keyValuesToJson(resource.attributes)
    const resourceDropped = Number(
      resource.droppedAttributesCount ?? resource.dropped_attributes_count ?? 0,
    )
    const serviceName = serviceNameFromResource(resource.attributes)

    for (const sl of asList(rl.scopeLogs ?? rl.scope_logs)) {
      const scope = (sl.scope ?? {}) as Record<string, unknown>
      const scopeName = String(scope.name ?? "") || undefined
      const scopeVersion = String(scope.version ?? "") || undefined
      const scopeAttributes = keyValuesToJson(scope.attributes)
      const scopeDropped = Number(
        scope.droppedAttributesCount ?? scope.dropped_attributes_count ?? 0,
      )

      for (const log of asList(sl.logRecords ?? sl.log_records)) {
        const observed = toBigInt(log.observedTimeUnixNano ?? log.observed_time_unix_nano, 0n)
        const severityNumber = Number(log.severityNumber ?? log.severity_number ?? 0)
        out.push({
          id: crypto.randomUUID(),
          timeNs: toBigInt(log.timeUnixNano ?? log.time_unix_nano, 0n),
          observedTimeNs: observed === 0n ? undefined : observed,
          severityNumber: severityNumber === 0 ? undefined : severityNumber,
          severityText: String(log.severityText ?? log.severity_text ?? "") || undefined,
          bodyAny: log.body != null ? anyValueToJson(log.body) : undefined,
          eventName: String(log.eventName ?? log.event_name ?? "") || undefined,
          serviceName,
          resourceAttributes,
          resourceDroppedAttributesCount: resourceDropped,
          scopeName,
          scopeVersion,
          scopeAttributes,
          scopeDroppedAttributesCount: scopeDropped,
          attributes: keyValuesToJson(log.attributes),
          droppedAttributesCount: Number(
            log.droppedAttributesCount ?? log.dropped_attributes_count ?? 0,
          ),
          flags: Number(log.flags ?? 0),
          traceId: optionalOtlpId(log.traceId ?? log.trace_id, "trace"),
          spanId: optionalOtlpId(log.spanId ?? log.span_id, "span"),
        })
      }
    }
  }

  return out
}

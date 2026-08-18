import { IdError, optionalOtlpId, parseOtlpId } from "../helpers/ids"
import { toBigInt } from "../../../../../shared/helpers"
import type { Json } from "../../../../../shared/helpers"
import type { SpanRecord } from "../../../../traces/types/span"
import { IngestError } from "../../errors"
import { keyValuesToJson, serviceNameFromResource } from "../helpers/values"

function asList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : []
}

function unixNano(value: unknown): bigint {
  return toBigInt(value, 0n)
}

export function mapTraceRequest(request: Record<string, unknown>): SpanRecord[] {
  const out: SpanRecord[] = []
  const resourceSpans = asList(request.resourceSpans ?? request.resource_spans)

  for (const rs of resourceSpans) {
    const resource = (rs.resource ?? {}) as Record<string, unknown>
    const resourceAttributes = keyValuesToJson(resource.attributes)
    const resourceDropped = Number(resource.droppedAttributesCount ?? resource.dropped_attributes_count ?? 0)
    const serviceName = serviceNameFromResource(resource.attributes)

    for (const ss of asList(rs.scopeSpans ?? rs.scope_spans)) {
      const scope = (ss.scope ?? {}) as Record<string, unknown>
      const scopeName = String(scope.name ?? "") || undefined
      const scopeVersion = String(scope.version ?? "") || undefined
      const scopeAttributes = keyValuesToJson(scope.attributes)
      const scopeDropped = Number(scope.droppedAttributesCount ?? scope.dropped_attributes_count ?? 0)

      for (const span of asList(ss.spans)) {
        try {
          out.push(
            mapSpan(
              span,
              serviceName,
              resourceAttributes,
              resourceDropped,
              scopeName,
              scopeVersion,
              scopeAttributes,
              scopeDropped,
            ),
          )
        } catch (err) {
          if (err instanceof IdError) {
            throw new IngestError("validation", err.message)
          }
          throw err
        }
      }
    }
  }

  return out
}

function mapSpan(
  span: Record<string, unknown>,
  serviceName: string,
  resourceAttributes: Json,
  resourceDroppedAttributesCount: number,
  scopeName: string | undefined,
  scopeVersion: string | undefined,
  scopeAttributes: Json,
  scopeDroppedAttributesCount: number,
): SpanRecord {
  const start = unixNano(span.startTimeUnixNano ?? span.start_time_unix_nano)
  const rawEnd = unixNano(span.endTimeUnixNano ?? span.end_time_unix_nano)
  const end = rawEnd === 0n ? start : rawEnd
  const status = (span.status ?? {}) as Record<string, unknown>
  const statusCode = Number(status.code ?? 0)
  const statusMessage = String(status.message ?? "")

  const events = asList(span.events).map((event) => ({
    timeUnixNano: String(event.timeUnixNano ?? event.time_unix_nano ?? "0"),
    name: String(event.name ?? ""),
    attributes: keyValuesToJson(event.attributes),
    droppedAttributesCount: Number(
      event.droppedAttributesCount ?? event.dropped_attributes_count ?? 0,
    ),
  }))

  const links = asList(span.links).map((link) => ({
    traceId: optionalOtlpId(link.traceId ?? link.trace_id, "trace") ?? null,
    spanId: optionalOtlpId(link.spanId ?? link.span_id, "span") ?? null,
    traceState: String(link.traceState ?? link.trace_state ?? ""),
    attributes: keyValuesToJson(link.attributes),
    droppedAttributesCount: Number(
      link.droppedAttributesCount ?? link.dropped_attributes_count ?? 0,
    ),
    flags: Number(link.flags ?? 0),
  }))

  const parentRaw = span.parentSpanId ?? span.parent_span_id
  const parentEmpty =
    parentRaw == null ||
    parentRaw === "" ||
    (parentRaw instanceof Uint8Array && parentRaw.length === 0)

  return {
    traceId: parseOtlpId(span.traceId ?? span.trace_id, "trace"),
    spanId: parseOtlpId(span.spanId ?? span.span_id, "span"),
    parentSpanId: parentEmpty ? undefined : parseOtlpId(parentRaw, "span"),
    name: String(span.name ?? ""),
    kind: Number(span.kind ?? 0),
    startTimeNs: start,
    endTimeNs: end,
    durationNs: end > start ? end - start : 0n,
    statusCode,
    statusMessage: statusMessage || undefined,
    traceState: String(span.traceState ?? span.trace_state ?? "") || undefined,
    flags: Number(span.flags ?? 0),
    droppedAttributesCount: Number(
      span.droppedAttributesCount ?? span.dropped_attributes_count ?? 0,
    ),
    droppedEventsCount: Number(
      span.droppedEventsCount ?? span.dropped_events_count ?? 0,
    ),
    droppedLinksCount: Number(
      span.droppedLinksCount ?? span.dropped_links_count ?? 0,
    ),
    serviceName,
    resourceAttributes,
    resourceDroppedAttributesCount,
    scopeName,
    scopeVersion,
    scopeAttributes,
    scopeDroppedAttributesCount,
    attributes: keyValuesToJson(span.attributes),
    events,
    links,
  }
}

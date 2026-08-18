import type { Db } from "../../../shared/db"
import { nestDottedKeys, nsToRfc3339 } from "../../../shared/helpers"
import type { LogDto, LogRecord } from "../types/log"
import * as repo from "../repositories/logs"

function dto(log: LogRecord): LogDto {
  return {
    id: log.id,
    time: nsToRfc3339(log.timeNs),
    severity_number: log.severityNumber ?? null,
    severity_text: log.severityText ?? null,
    body: log.bodyAny ?? null,
    service_name: log.serviceName || "unknown_service",
    attributes: nestDottedKeys(log.attributes ?? {}),
    scope_name: log.scopeName ?? null,
    scope_version: log.scopeVersion ?? null,
    trace_id: log.traceId ?? null,
    span_id: log.spanId ?? null,
  }
}

export async function execute(db: Db, traceId: string): Promise<LogDto[]> {
  const logs = await db.run((conn) => repo.forTrace(conn, traceId))
  return logs.map(dto)
}

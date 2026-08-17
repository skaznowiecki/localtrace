import type { Db } from "../../../shared/db"
import type { TraceListFilters, TraceSummary, SpanRecord, TraceFacets } from "../types/span"
import * as repo from "../repositories/traces"

export async function list(
  db: Db,
  filters: TraceListFilters,
): Promise<TraceSummary[]> {
  return db.run((conn) => repo.listTraces(conn, filters))
}

export async function facets(db: Db): Promise<TraceFacets> {
  return db.run((conn) => repo.listFacets(conn))
}

export async function getWithSpans(
  db: Db,
  traceId: string,
): Promise<{ trace: TraceSummary; spans: SpanRecord[] } | undefined> {
  return db.run((conn) => repo.getTraceWithSpans(conn, traceId))
}

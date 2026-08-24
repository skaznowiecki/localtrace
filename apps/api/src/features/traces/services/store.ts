import type { Db } from "@shared/db"
import { normalizeRoutePath } from "@shared/helpers"
import { overlayAttributes } from "@features/ingest/providers/overlay"
import type { SpanRecord, TraceSummary } from "../types/span"
import * as repo from "../repositories/traces"
import {
  extractHttpFields,
  extractHttpFullUrl,
  extractHttpUrl,
  resolveTraceStatus,
} from "../helpers/trace-status"

function summaryFromRebuild(row: repo.RebuildRow): TraceSummary {
  const root = {
    name: row.rootName ?? "",
    statusCode: row.rootStatusCode,
    attributes: overlayAttributes(row.rootIngestProvider, row.rootAttributes),
  }
  const http = extractHttpFields(root)
  const path = extractHttpUrl(root)
  const httpRoute = path ? normalizeRoutePath(path) : undefined

  return {
    traceId: row.traceId,
    rootSpanId: row.rootSpanId,
    rootObserved: row.rootObserved,
    rootService: row.rootService,
    rootName: row.rootName,
    startTimeNs: row.startTimeNs,
    endTimeNs: row.endTimeNs,
    durationNs: row.durationNs > 0n ? row.durationNs : 0n,
    status: resolveTraceStatus(root, http.statusCode),
    spanCount: row.spanCount,
    httpMethod: http.method,
    httpStatusCode: http.statusCode,
    httpUrl: extractHttpFullUrl(root),
    httpRoute: httpRoute || undefined,
    breakdown: null,
  }
}

export async function execute(db: Db, spans: SpanRecord[]): Promise<void> {
  if (spans.length === 0) return

  const traceIds = [...new Set(spans.map((s) => s.traceId))]

  await db.run(async (conn) => {
    await conn.run("BEGIN")
    try {
      await repo.upsertSpans(conn, spans)
      const rows = await repo.rebuild(conn, traceIds)
      await repo.upsert(
        conn,
        rows.map(summaryFromRebuild),
      )
      await conn.run("COMMIT")
    } catch (err) {
      try {
        await conn.run("ROLLBACK")
      } catch {
        // ignore
      }
      throw err
    }
  })
}

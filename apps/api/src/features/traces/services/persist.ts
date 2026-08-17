import type { Db } from "../../../db/client"
import type { SpanRecord, TraceSummary } from "../types/span"
import * as repo from "../repositories/traces"
import { normalizeRoutePath } from "./normalize-route"
import { extractHttpFields, extractHttpUrl, resolveTraceStatus } from "./trace-status"

function summaryFromRebuild(row: repo.TraceRebuildRow): TraceSummary {
  const root = {
    name: row.rootName ?? "",
    statusCode: row.rootStatusCode,
    attributes: row.rootAttributes,
  }
  const http = extractHttpFields(root)
  const httpUrl = extractHttpUrl(root)
  const httpRoute = httpUrl ? normalizeRoutePath(httpUrl) : undefined

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
    httpUrl,
    httpRoute: httpRoute || undefined,
  }
}

export async function persistSpans(db: Db, spans: SpanRecord[]): Promise<void> {
  if (spans.length === 0) return

  const traceIds = [...new Set(spans.map((s) => s.traceId))]

  await db.run(async (conn) => {
    await conn.run("BEGIN")
    try {
      await repo.upsertSpans(conn, spans)
      const rebuild = await repo.loadTraceRebuildRows(conn, traceIds)
      await repo.upsertTraceSummaries(
        conn,
        rebuild.map(summaryFromRebuild),
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

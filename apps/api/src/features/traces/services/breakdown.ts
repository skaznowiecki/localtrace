import type { Db } from "@shared/db"
import { aggregate, serialize, type SpanLite } from "../helpers/breakdown"
import * as repo from "../repositories/traces"

const BATCH = 50

export async function execute(db: Db): Promise<void> {
  for (;;) {
    const more = await db.run(async (conn) => {
      const ids = await repo.pending(conn, BATCH)
      if (ids.length === 0) return false

      const spans = await repo.forBreakdown(conn, ids)
      const byTrace = new Map<string, SpanLite[]>()
      for (const id of ids) byTrace.set(id, [])
      for (const span of spans) {
        const list = byTrace.get(span.traceId)
        if (!list) continue
        list.push({
          spanId: span.spanId,
          parentSpanId: span.parentSpanId,
          name: span.name,
          kind: span.kind,
          attributes: span.attributes,
          startTimeNs: span.startTimeNs,
          durationNs: span.durationNs,
        })
      }

      await repo.updateBreakdown(
        conn,
        ids.map((traceId) => ({
          traceId,
          json: serialize(aggregate(byTrace.get(traceId) ?? [])),
        })),
      )
      return ids.length === BATCH
    })
    if (!more) return
  }
}

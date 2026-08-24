import type { Db } from "@shared/db"
import { windowNs } from "@shared/helpers"
import { typedSpan, type SpanExtractType } from "../helpers/span-extract"
import * as repo from "../repositories/traces"
import type { TypedSpanDto } from "../types/dto"

const SCAN_LIMIT = 2000

export type SearchSpansInput = {
  q?: string
  type?: SpanExtractType
  service?: string
  status?: "ok" | "error"
  since?: string
  until?: string
  since_minutes?: number
  until_minutes?: number
  limit?: number
}

export async function execute(
  db: Db,
  input: SearchSpansInput,
): Promise<TypedSpanDto[]> {
  const window = windowNs(input)
  const limit = Math.min(input.limit ?? 20, 100)
  const records = await db.run((conn) =>
    repo.searchSpans(conn, {
      q: input.q,
      service: input.service,
      sinceNs: window.sinceNs,
      untilNs: window.untilNs,
      scanLimit: SCAN_LIMIT,
    }),
  )

  const items: TypedSpanDto[] = []
  for (const record of records) {
    if (input.status === "error" && record.statusCode !== 2) continue
    if (input.status === "ok" && record.statusCode === 2) continue
    const extracted = typedSpan(record, record.startTimeNs, input.type)
    if (extracted) items.push(extracted)
    if (items.length >= limit) break
  }
  return items
}

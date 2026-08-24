import * as z from "zod"
import { rawInput, rawQuery, traceId, traceIdParam } from "@shared/helpers"

export const param = traceIdParam
export const query = rawQuery
export const input = z.object({
  trace_id: traceId.describe("32-char hex trace id"),
  raw: rawInput,
  detail: z
    .enum(["overview", "full"])
    .optional()
    .describe("overview (default) is a compact tree; full includes span attributes"),
})

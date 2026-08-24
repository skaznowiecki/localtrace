import * as z from "zod"
import { rawInput, spanId, traceId } from "@shared/helpers"

export const input = z.object({
  span_id: spanId.describe("16-char hex span id"),
  trace_id: traceId.optional().describe("32-char hex trace id; required if span_id is not unique"),
  raw: rawInput,
})

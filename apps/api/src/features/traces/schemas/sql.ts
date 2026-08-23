import * as z from "zod"
import { traceId, traceIdParam } from "@shared/helpers"

export const param = traceIdParam
export const input = z.object({
  trace_id: traceId.describe("32-char hex trace id"),
})

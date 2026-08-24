import * as z from "zod"
import { traceId } from "@shared/helpers"

export const input = z.object({
  trace_id: traceId.describe("32-char hex trace id"),
})

export const sinceMinutes = z.object({
  since_minutes: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Look back this many minutes (default 15)"),
})

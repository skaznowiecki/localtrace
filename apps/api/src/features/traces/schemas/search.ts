import * as z from "zod"
import { SPAN_EXTRACT_TYPES } from "../helpers/span-extract"

export const input = z.object({
  q: z
    .string()
    .optional()
    .describe("Substring match on span name or attributes JSON"),
  type: z.enum(SPAN_EXTRACT_TYPES).optional().describe("Filter by extracted span type"),
  service: z.string().optional().describe("Filter by span service name"),
  status: z.enum(["ok", "error"]).optional().describe("Filter by span status"),
  since: z
    .iso
    .datetime({ offset: true })
    .optional()
    .describe("RFC3339 timestamp; only spans starting after this"),
  until: z
    .iso
    .datetime({ offset: true })
    .optional()
    .describe("RFC3339 timestamp; only spans starting before this"),
  since_minutes: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Only spans from the last N minutes (preferred over since)"),
  until_minutes: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("Only spans older than N minutes ago"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Max hits to return (default 20)"),
})

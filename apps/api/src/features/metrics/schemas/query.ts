import * as z from "zod"

export const input = z.object({
  name: z.string().describe("Metric name"),
  service: z.string().optional().describe("Filter by service name"),
  since: z
    .iso
    .datetime({ offset: true })
    .optional()
    .describe("RFC3339 timestamp; only points after this"),
  until: z
    .iso
    .datetime({ offset: true })
    .optional()
    .describe("RFC3339 timestamp; only points before this"),
  since_minutes: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Only points from the last N minutes (preferred over since)"),
  until_minutes: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("Only points older than N minutes ago"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe("Max points to return (default 100)"),
})

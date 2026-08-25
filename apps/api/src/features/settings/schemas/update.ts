import * as z from "zod"

export const body = z.object({
  retentionHours: z.union([
    z.literal(1),
    z.literal(6),
    z.literal(24),
    z.literal(168),
  ]),
})

import * as z from "zod"

export const rawQuery = z.object({
  raw: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((value) => value === "true" || value === "1"),
})

export const rawInput = z
  .boolean()
  .optional()
  .describe("Return attributes as ingested, without overlay or type classification")

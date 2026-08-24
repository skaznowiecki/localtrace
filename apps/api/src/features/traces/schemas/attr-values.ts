import * as z from "zod"

export const query = z.object({
  key: z.string().min(1),
})

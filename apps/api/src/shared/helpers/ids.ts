import * as z from "zod"

function hexId(kind: "trace" | "span", length: number) {
  return z
    .string()
    .trim()
    .transform((value) => value.replace(/-/g, ""))
    .pipe(
      z
        .string()
        .length(length, {
          error: (iss) =>
            `invalid ${kind} id: expected ${length} hex chars, got ${String(iss.input).length}`,
        })
        .regex(/^[0-9a-fA-F]+$/, {
          error: `invalid ${kind} id: non-hex character`,
        })
        .refine((value) => !/^0+$/.test(value), {
          error: `invalid ${kind} id: all-zero id`,
        })
        .transform((value) => value.toLowerCase()),
    )
}

export const traceId = hexId("trace", 32)
export const spanId = hexId("span", 16)
export const traceIdParam = z.object({ id: traceId })

export function optionalId<T>(
  schema: z.ZodType<T>,
  value: unknown,
): T | undefined {
  const result = schema.safeParse(value)
  return result.success ? result.data : undefined
}

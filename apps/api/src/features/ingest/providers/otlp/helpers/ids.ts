import * as z from "zod"
import { optionalId, spanId, traceId } from "@shared/helpers"

function hexEncode(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

function idBytes(kind: "trace" | "span", byteLen: number) {
  const allZero =
    kind === "trace"
      ? "invalid trace id: all-zero trace id"
      : "invalid span id: all-zero span id"

  return z
    .instanceof(Uint8Array)
    .refine(
      (bytes) => bytes.length === byteLen,
      {
        error: (iss) =>
          `invalid ${kind} id: expected ${byteLen} bytes, got ${(iss.input as Uint8Array).length}`,
      },
    )
    .refine((bytes) => !bytes.every((b) => b === 0), { error: allZero })
    .transform(hexEncode)
}

const otlpTraceId = z.union([traceId, idBytes("trace", 16)], {
  error: "invalid trace id",
})
const otlpSpanId = z.union([spanId, idBytes("span", 8)], {
  error: "invalid span id",
})

function schema(kind: "trace" | "span") {
  return kind === "trace" ? otlpTraceId : otlpSpanId
}

export function parseOtlpId(value: unknown, kind: "trace" | "span"): string {
  return schema(kind).parse(value)
}

export function optionalOtlpId(
  value: unknown,
  kind: "trace" | "span",
): string | undefined {
  return optionalId(schema(kind), value)
}

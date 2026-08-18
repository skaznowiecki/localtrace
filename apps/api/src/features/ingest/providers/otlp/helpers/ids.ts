import { IdError, normalizeTraceId } from "../../../../../shared/helpers"

const SPAN_ID_LEN = 16

function hexEncode(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

function normalizeSpanId(input: string): string {
  const trimmed = input.trim()
  if (trimmed.length !== SPAN_ID_LEN) {
    throw new IdError(
      `invalid span id: expected ${SPAN_ID_LEN} hex chars, got ${trimmed.length}`,
    )
  }
  if (![...trimmed].every((c) => /[0-9a-fA-F]/.test(c))) {
    throw new IdError("invalid span id: non-hex character")
  }
  const lower = trimmed.toLowerCase()
  if ([...lower].every((c) => c === "0")) {
    throw new IdError("invalid span id: all-zero id")
  }
  return lower
}

function normalizeTraceIdBytes(bytes: Uint8Array): string {
  if (bytes.length !== 16) {
    throw new IdError(`invalid trace id: expected 16 bytes, got ${bytes.length}`)
  }
  if (bytes.every((b) => b === 0)) {
    throw new IdError("invalid trace id: all-zero trace id")
  }
  return hexEncode(bytes)
}

function normalizeSpanIdBytes(bytes: Uint8Array): string {
  if (bytes.length !== 8) {
    throw new IdError(`invalid span id: expected 8 bytes, got ${bytes.length}`)
  }
  if (bytes.every((b) => b === 0)) {
    throw new IdError("invalid span id: all-zero span id")
  }
  return hexEncode(bytes)
}

export function parseOtlpId(
  value: unknown,
  kind: "trace" | "span",
): string {
  if (typeof value === "string") {
    return kind === "trace" ? normalizeTraceId(value) : normalizeSpanId(value)
  }
  if (value instanceof Uint8Array) {
    return kind === "trace"
      ? normalizeTraceIdBytes(value)
      : normalizeSpanIdBytes(value)
  }
  if (Buffer.isBuffer(value)) {
    return kind === "trace"
      ? normalizeTraceIdBytes(value)
      : normalizeSpanIdBytes(value)
  }
  throw new IdError(`invalid ${kind} id`)
}

export function optionalOtlpId(
  value: unknown,
  kind: "trace" | "span",
): string | undefined {
  if (value == null || value === "") return undefined
  if (value instanceof Uint8Array && value.length === 0) return undefined
  try {
    return parseOtlpId(value, kind)
  } catch {
    return undefined
  }
}

export { IdError }

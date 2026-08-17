const TRACE_ID_LEN = 32
const SPAN_ID_LEN = 16

export class IdError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "IdError"
  }
}

function hexEncode(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

function normalizeHexId(input: string, expectedLen: number, kind: "trace" | "span"): string {
  const trimmed = input.trim()
  if (trimmed.length !== expectedLen) {
    throw new IdError(
      `invalid ${kind} id: expected ${expectedLen} hex chars, got ${trimmed.length}`,
    )
  }
  if (![...trimmed].every((c) => /[0-9a-fA-F]/.test(c))) {
    throw new IdError(`invalid ${kind} id: non-hex character`)
  }
  const lower = trimmed.toLowerCase()
  if ([...lower].every((c) => c === "0")) {
    throw new IdError(`invalid ${kind} id: all-zero id`)
  }
  return lower
}

export function normalizeTraceId(input: string): string {
  return normalizeHexId(input, TRACE_ID_LEN, "trace")
}

export function normalizeSpanId(input: string): string {
  return normalizeHexId(input, SPAN_ID_LEN, "span")
}

export function normalizeTraceIdBytes(bytes: Uint8Array): string {
  if (bytes.length !== 16) {
    throw new IdError(`invalid trace id: expected 16 bytes, got ${bytes.length}`)
  }
  if (bytes.every((b) => b === 0)) {
    throw new IdError("invalid trace id: all-zero trace id")
  }
  return hexEncode(bytes)
}

export function normalizeSpanIdBytes(bytes: Uint8Array): string {
  if (bytes.length !== 8) {
    throw new IdError(`invalid span id: expected 8 bytes, got ${bytes.length}`)
  }
  if (bytes.every((b) => b === 0)) {
    throw new IdError("invalid span id: all-zero span id")
  }
  return hexEncode(bytes)
}

export function optionalTraceId(input: string): string | undefined {
  try {
    return normalizeTraceId(input)
  } catch {
    return undefined
  }
}

export function optionalSpanId(input: string): string | undefined {
  try {
    return normalizeSpanId(input)
  } catch {
    return undefined
  }
}

export function optionalTraceIdBytes(bytes: Uint8Array): string | undefined {
  if (bytes.length === 0) return undefined
  try {
    return normalizeTraceIdBytes(bytes)
  } catch {
    return undefined
  }
}

export function optionalSpanIdBytes(bytes: Uint8Array): string | undefined {
  if (bytes.length === 0) return undefined
  try {
    return normalizeSpanIdBytes(bytes)
  } catch {
    return undefined
  }
}

export function isRootParent(parentSpanId: string | undefined | null): boolean {
  return parentSpanId == null || parentSpanId === ""
}

export function parseOtlpId(
  value: unknown,
  kind: "trace" | "span",
): string {
  if (typeof value === "string") {
    return kind === "trace" ? normalizeTraceId(value) : normalizeSpanId(value)
  }
  if (value instanceof Uint8Array) {
    return kind === "trace" ? normalizeTraceIdBytes(value) : normalizeSpanIdBytes(value)
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

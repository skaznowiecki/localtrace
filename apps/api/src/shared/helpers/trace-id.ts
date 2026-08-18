const TRACE_ID_LEN = 32

export class IdError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "IdError"
  }
}

export function normalizeTraceId(input: string): string {
  const trimmed = input.trim()
  if (trimmed.length !== TRACE_ID_LEN) {
    throw new IdError(
      `invalid trace id: expected ${TRACE_ID_LEN} hex chars, got ${trimmed.length}`,
    )
  }
  if (![...trimmed].every((c) => /[0-9a-fA-F]/.test(c))) {
    throw new IdError("invalid trace id: non-hex character")
  }
  const lower = trimmed.toLowerCase()
  if ([...lower].every((c) => c === "0")) {
    throw new IdError("invalid trace id: all-zero id")
  }
  return lower
}

export function nsToRfc3339(ns: bigint): string {
  const secs = ns / 1_000_000_000n
  const nanos = ns % 1_000_000_000n
  const date = new Date(Number(secs) * 1000)
  if (Number.isNaN(date.getTime())) return new Date().toISOString()
  const iso = date.toISOString()
  const pad = nanos.toString().padStart(9, "0")
  return iso.replace(/\.\d{3}Z$/, `.${pad}Z`)
}

export function rfc3339ToNs(value: string): bigint | undefined {
  const ms = Date.parse(value)
  if (Number.isNaN(ms) || ms < 0) return undefined
  return BigInt(ms) * 1_000_000n
}

export type TimeWindowInput = {
  since?: string
  until?: string
  since_minutes?: number
  until_minutes?: number
}

export function windowNs(
  input: TimeWindowInput,
  nowMs = Date.now(),
): { sinceNs?: bigint; untilNs?: bigint } {
  const sinceNs =
    input.since_minutes != null
      ? BigInt(nowMs - input.since_minutes * 60_000) * 1_000_000n
      : input.since
        ? rfc3339ToNs(input.since)
        : undefined
  const untilNs =
    input.until_minutes != null
      ? BigInt(nowMs - input.until_minutes * 60_000) * 1_000_000n
      : input.until
        ? rfc3339ToNs(input.until)
        : undefined
  return { sinceNs, untilNs }
}

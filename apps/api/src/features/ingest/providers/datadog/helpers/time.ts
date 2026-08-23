export function toNs(value: unknown): bigint {
  if (typeof value === "bigint") return value
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.trunc(value))
  }
  if (typeof value === "string" && /^-?\d+$/.test(value)) return BigInt(value)
  return 0n
}

export function unixToNs(value: unknown): bigint {
  if (typeof value === "string") {
    const ms = Date.parse(value)
    if (!Number.isNaN(ms)) return BigInt(ms) * 1_000_000n
    if (/^-?\d+$/.test(value)) return unixToNs(Number(value))
    return 0n
  }
  if (typeof value === "bigint") {
    if (value > 1_000_000_000_000_000_000n) return value
    if (value > 1_000_000_000_000n) return value * 1_000_000n
    return value * 1_000_000_000n
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return 0n
  if (value > 1e18) return BigInt(Math.trunc(value))
  if (value > 1e12) return BigInt(Math.trunc(value)) * 1_000_000n
  return BigInt(Math.trunc(value)) * 1_000_000_000n
}

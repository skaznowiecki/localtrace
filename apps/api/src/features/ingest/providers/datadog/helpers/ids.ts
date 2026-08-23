import { IngestError } from "../../errors"

export function toU64(value: unknown): bigint {
  if (typeof value === "bigint") return value < 0n ? value + (1n << 64n) : value
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.trunc(value))
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) return BigInt(trimmed)
    if (/^[0-9a-fA-F]{16}$/.test(trimmed)) return BigInt(`0x${trimmed}`)
    if (/^\d+$/.test(trimmed)) return BigInt(trimmed)
  }
  return 0n
}

export function hex16(value: unknown): string {
  return toU64(value).toString(16).padStart(16, "0")
}

export function spanIdHex(value: unknown): string {
  return hex16(value)
}

export function parentIdHex(value: unknown): string | undefined {
  if (toU64(value) === 0n) return undefined
  return hex16(value)
}

export function traceIdHex(
  id: unknown,
  meta: Record<string, string>,
): string {
  const low = hex16(id)
  const tid = meta["_dd.p.tid"] ?? ""
  const high = /^[0-9a-fA-F]{1,16}$/.test(tid)
    ? tid.toLowerCase().padStart(16, "0")
    : "0".repeat(16)
  return high + low
}

export function hexFromDdId(
  value: unknown,
  width: 16 | 32,
): string | undefined {
  if (value == null) return undefined
  if (typeof value === "string") {
    const hex = value.replace(/^0x/i, "").toLowerCase()
    if (/^[0-9a-f]+$/.test(hex)) return hex.padStart(width, "0").slice(-width)
    if (/^\d+$/.test(value)) {
      return BigInt(value).toString(16).padStart(width, "0").slice(-width)
    }
    return undefined
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return toU64(value).toString(16).padStart(width, "0").slice(-width)
  }
  return undefined
}

export function invalidPayload(message: string): never {
  throw new IngestError("invalid_payload", message)
}

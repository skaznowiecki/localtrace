import { nestDottedKeys, type Json } from "@shared/helpers"

const JSON_SAFE_INT_MAX = 9_007_199_254_740_991n

type KeyValue = {
  key?: string
  value?: unknown
}

function intToJson(v: bigint): Json {
  if (v >= -JSON_SAFE_INT_MAX && v <= JSON_SAFE_INT_MAX) return Number(v)
  return v.toString()
}

function toBig(value: unknown): bigint {
  if (typeof value === "bigint") return value
  if (typeof value === "number") return BigInt(Math.trunc(value))
  if (typeof value === "string" && value !== "") return BigInt(value)
  if (value && typeof value === "object" && "toString" in value) {
    try {
      return BigInt(String(value))
    } catch {
      return 0n
    }
  }
  return 0n
}

export function anyValueToJson(value: unknown): Json {
  if (value == null) return null
  if (typeof value !== "object") return value as Json
  const v = value as Record<string, unknown>

  if ("stringValue" in v && v.stringValue != null) return String(v.stringValue)
  if ("string_value" in v && v.string_value != null) return String(v.string_value)
  if ("boolValue" in v && v.boolValue != null) return Boolean(v.boolValue)
  if ("bool_value" in v && v.bool_value != null) return Boolean(v.bool_value)
  if ("intValue" in v && v.intValue != null) return intToJson(toBig(v.intValue))
  if ("int_value" in v && v.int_value != null) return intToJson(toBig(v.int_value))
  if ("doubleValue" in v && v.doubleValue != null) return Number(v.doubleValue)
  if ("double_value" in v && v.double_value != null) return Number(v.double_value)
  if ("bytesValue" in v && v.bytesValue != null) return bytesToB64(v.bytesValue)
  if ("bytes_value" in v && v.bytes_value != null) return bytesToB64(v.bytes_value)

  const arrayValue = v.arrayValue ?? v.array_value
  if (arrayValue && typeof arrayValue === "object") {
    const values = (arrayValue as { values?: unknown[] }).values ?? []
    return values.map((item) => anyValueToJson(item))
  }

  const kvlist = v.kvlistValue ?? v.kvlist_value
  if (kvlist && typeof kvlist === "object") {
    const values = (kvlist as { values?: KeyValue[] }).values ?? []
    return keyValuesToJson(values)
  }

  return null
}

function bytesToB64(value: unknown): string {
  if (typeof value === "string") return value
  if (value instanceof Uint8Array) return Buffer.from(value).toString("base64")
  if (Buffer.isBuffer(value)) return value.toString("base64")
  return ""
}

export function keyValuesToJson(values: unknown): Json {
  const list = Array.isArray(values) ? (values as KeyValue[]) : []
  const map: Record<string, Json> = {}
  for (const kv of list) {
    if (!kv?.key) continue
    map[kv.key] = anyValueToJson(kv.value)
  }
  return nestDottedKeys(map)
}

export function serviceNameFromResource(attributes: unknown): string {
  if (!Array.isArray(attributes)) return "unknown_service"
  for (const kv of attributes as KeyValue[]) {
    if (kv?.key === "service.name") {
      const json = anyValueToJson(kv.value)
      return typeof json === "string" && json.length > 0 ? json : "unknown_service"
    }
  }
  return "unknown_service"
}

import { invalidPayload } from "../helpers/ids"
import { asList, asRecord } from "../helpers/values"
import { mapLogs } from "../mappers/logs"
import type { LogRecord } from "@features/logs/types/log"

export function parse(body: Uint8Array): LogRecord[] {
  const text = new TextDecoder().decode(body).trim()
  if (!text) return []
  try {
    if (text.startsWith("[")) {
      const parsed = JSON.parse(text) as unknown
      return mapLogs(Array.isArray(parsed) ? parsed : [parsed])
    }
    if (text.includes("\n")) {
      const items = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line) as unknown)
      return mapLogs(items)
    }
    const parsed = JSON.parse(text) as unknown
    const rec = asRecord(parsed)
    if (Array.isArray(rec.logs)) return mapLogs(asList(rec.logs))
    return mapLogs([parsed])
  } catch (err) {
    if (err && typeof err === "object" && "type" in err) throw err
    const message = err instanceof Error ? err.message : String(err)
    invalidPayload(`log decode failed: ${message}`)
  }
}

import { invalidPayload } from "../helpers/ids"
import { mapTraces } from "../mappers/traces"
import type { SpanRecord } from "@features/traces/types/span"

export function parse(body: Uint8Array): SpanRecord[] {
  const text = new TextDecoder().decode(body).trim()
  if (!text) return []
  try {
    return mapTraces(JSON.parse(text) as unknown)
  } catch (err) {
    if (err && typeof err === "object" && "type" in err) throw err
    const message = err instanceof Error ? err.message : String(err)
    invalidPayload(`json decode failed: ${message}`)
  }
}

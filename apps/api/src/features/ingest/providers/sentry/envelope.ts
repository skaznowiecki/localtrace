import { IngestError } from "../errors"

const NL = 0x0a

export type EnvelopeItem = {
  type: string
  header: Record<string, unknown>
  payload: Uint8Array
}

export type ParsedEnvelope = {
  header: Record<string, unknown>
  items: EnvelopeItem[]
}

function findNewline(body: Uint8Array, from: number): number {
  for (let i = from; i < body.length; i++) {
    if (body[i] === NL) return i
  }
  return -1
}

function decodeJsonObject(bytes: Uint8Array, label: string): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new IngestError("invalid_payload", `sentry ${label}: ${message}`)
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new IngestError("invalid_payload", `sentry ${label}: expected object`)
  }
  return parsed as Record<string, unknown>
}

function gunzipItem(payload: Uint8Array): Uint8Array {
  try {
    return Bun.gunzipSync(payload as unknown as ArrayBuffer)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new IngestError("invalid_payload", `sentry item gzip decode failed: ${message}`)
  }
}

export function parseEnvelope(body: Uint8Array): ParsedEnvelope {
  if (body.byteLength === 0) {
    throw new IngestError("invalid_payload", "sentry envelope is empty")
  }

  const headerEnd = findNewline(body, 0)
  const headerBytes = headerEnd === -1 ? body : body.subarray(0, headerEnd)
  const header = decodeJsonObject(headerBytes, "envelope header")

  const items: EnvelopeItem[] = []
  if (headerEnd === -1) return { header, items }

  let offset = headerEnd + 1
  while (offset < body.byteLength) {
    if (offset === body.byteLength - 1 && body[offset] === NL) break

    const itemHeaderEnd = findNewline(body, offset)
    const itemHeaderBytes =
      itemHeaderEnd === -1 ? body.subarray(offset) : body.subarray(offset, itemHeaderEnd)
    if (itemHeaderBytes.byteLength === 0) break

    const itemHeader = decodeJsonObject(itemHeaderBytes, "item header")
    const type = String(itemHeader.type ?? "")
    if (!type) {
      throw new IngestError("invalid_payload", "sentry item header missing type")
    }

    let payload: Uint8Array
    if (itemHeaderEnd === -1) {
      throw new IngestError("invalid_payload", "sentry item missing payload")
    }

    offset = itemHeaderEnd + 1
    const lengthRaw = itemHeader.length
    if (lengthRaw != null && lengthRaw !== "") {
      const length = Number(lengthRaw)
      if (!Number.isFinite(length) || length < 0) {
        throw new IngestError("invalid_payload", "sentry item has invalid length")
      }
      const end = offset + length
      if (end > body.byteLength) {
        throw new IngestError("invalid_payload", "sentry item truncated")
      }
      payload = body.subarray(offset, end)
      offset = end
      if (offset < body.byteLength) {
        if (body[offset] !== NL) {
          throw new IngestError("invalid_payload", "sentry item missing trailing newline")
        }
        offset += 1
      }
    } else {
      const payloadEnd = findNewline(body, offset)
      if (payloadEnd === -1) {
        payload = body.subarray(offset)
        offset = body.byteLength
      } else {
        payload = body.subarray(offset, payloadEnd)
        offset = payloadEnd + 1
      }
    }

    if (String(itemHeader.content_encoding ?? "").toLowerCase() === "gzip") {
      payload = gunzipItem(payload)
    }

    items.push({ type, header: itemHeader, payload })
  }

  return { header, items }
}

export function parseItemJson(item: EnvelopeItem): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder().decode(item.payload)) as unknown
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new IngestError("invalid_payload", `sentry ${item.type} payload: ${message}`)
  }
  if (Array.isArray(parsed)) return { items: parsed }
  if (!parsed || typeof parsed !== "object") {
    throw new IngestError(
      "invalid_payload",
      `sentry ${item.type} payload: expected object`,
    )
  }
  return parsed as Record<string, unknown>
}

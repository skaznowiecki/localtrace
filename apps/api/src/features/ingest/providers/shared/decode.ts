import { IngestError } from "../errors"
import type { IngestRequestContext } from "../types"

function parseContentEncoding(value: string | undefined): boolean {
  if (!value || value.trim() === "" || value.trim().toLowerCase() === "identity") {
    return false
  }
  if (value.trim().toLowerCase() === "gzip") return true
  throw new IngestError("unsupported_content_encoding", `unsupported content encoding: ${value}`)
}

export function decodeBody(
  body: Uint8Array,
  ctx: IngestRequestContext,
): Uint8Array {
  const { maxBytes } = ctx
  if (body.byteLength > maxBytes) {
    throw new IngestError("payload_too_large")
  }

  if (!parseContentEncoding(ctx.contentEncoding)) return body

  let out: Uint8Array
  try {
    out = Bun.gunzipSync(body)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new IngestError("invalid_payload", `gzip decode failed: ${message}`)
  }
  if (out.byteLength > maxBytes) {
    throw new IngestError("payload_too_large")
  }
  return out
}

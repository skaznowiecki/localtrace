import { gunzipSync } from "node:zlib"
import { OtlpError, type PayloadFormat } from "../../types/otlp"

export function parseContentType(value: string | undefined): PayloadFormat {
  if (!value) {
    throw new OtlpError("unsupported media type: missing", "unsupported_media_type")
  }
  const media = value.split(";")[0]?.trim().toLowerCase() ?? ""
  if (media === "application/x-protobuf" || media === "application/protobuf") {
    return "protobuf"
  }
  if (media === "application/json") return "json"
  throw new OtlpError(`unsupported media type: ${value}`, "unsupported_media_type")
}

export function parseContentEncoding(value: string | undefined): boolean {
  if (!value || value.trim() === "" || value.trim().toLowerCase() === "identity") {
    return false
  }
  if (value.trim().toLowerCase() === "gzip") return true
  throw new OtlpError(
    `unsupported content encoding: ${value}`,
    "unsupported_content_encoding",
  )
}

export function decodeBody(
  body: Uint8Array,
  gzip: boolean,
  maxBytes: number,
): Uint8Array {
  if (body.byteLength > maxBytes) {
    throw new OtlpError("payload too large", "payload_too_large")
  }
  if (!gzip) return body

  let out: Uint8Array
  try {
    out = gunzipSync(body)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new OtlpError(`gzip decode failed: ${message}`, "invalid_payload")
  }
  if (out.byteLength > maxBytes) {
    throw new OtlpError("payload too large", "payload_too_large")
  }
  return out
}

export function contentTypeFor(format: PayloadFormat): string {
  return format === "protobuf" ? "application/x-protobuf" : "application/json"
}

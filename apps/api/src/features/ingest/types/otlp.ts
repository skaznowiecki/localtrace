export type PayloadFormat = "json" | "protobuf"

export class OtlpError extends Error {
  constructor(
    message: string,
    readonly kind:
      | "unsupported_media_type"
      | "unsupported_content_encoding"
      | "payload_too_large"
      | "invalid_payload"
      | "validation",
  ) {
    super(message)
    this.name = "OtlpError"
  }
}

export type OtlpMeta = {
  format: PayloadFormat
  gzip: boolean
}

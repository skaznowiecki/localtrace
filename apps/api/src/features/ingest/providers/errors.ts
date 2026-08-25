import { AppError } from "@shared/errors"

export type IngestErrorType =
  | "unsupported_media_type"
  | "unsupported_protocol"
  | "unsupported_content_encoding"
  | "payload_too_large"
  | "invalid_payload"
  | "validation"

const STATUS = {
  unsupported_media_type: 415,
  unsupported_protocol: 415,
  unsupported_content_encoding: 415,
  payload_too_large: 413,
  invalid_payload: 400,
  validation: 400,
} as const satisfies Record<IngestErrorType, number>

export class IngestError extends AppError {
  constructor(
    readonly type: IngestErrorType,
    message?: string,
  ) {
    super(message ?? type, STATUS[type])
    this.name = "IngestError"
  }
}

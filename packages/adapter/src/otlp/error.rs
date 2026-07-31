use thiserror::Error;

#[derive(Debug, Error)]
pub enum OtlpError {
    #[error("unsupported media type: {0}")]
    UnsupportedMediaType(String),

    #[error("unsupported content encoding: {0}")]
    UnsupportedContentEncoding(String),

    #[error("payload too large")]
    PayloadTooLarge,

    #[error("invalid payload: {0}")]
    InvalidPayload(String),

    #[error("validation error: {0}")]
    Validation(String),
}

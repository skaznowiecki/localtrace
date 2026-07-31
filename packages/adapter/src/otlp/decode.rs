use super::error::OtlpError;
use flate2::read::GzDecoder;
use std::io::Read;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PayloadFormat {
    Protobuf,
    Json,
}

pub fn parse_content_type(value: Option<&str>) -> Result<PayloadFormat, OtlpError> {
    let raw = value.ok_or_else(|| OtlpError::UnsupportedMediaType("missing".into()))?;
    let media = raw.split(';').next().unwrap_or(raw).trim().to_ascii_lowercase();
    match media.as_str() {
        "application/x-protobuf" | "application/protobuf" => Ok(PayloadFormat::Protobuf),
        "application/json" => Ok(PayloadFormat::Json),
        _ => Err(OtlpError::UnsupportedMediaType(raw.to_string())),
    }
}

pub fn parse_content_encoding(value: Option<&str>) -> Result<bool, OtlpError> {
    match value.map(|v| v.trim().to_ascii_lowercase()) {
        None => Ok(false),
        Some(v) if v.is_empty() || v == "identity" => Ok(false),
        Some(v) if v == "gzip" => Ok(true),
        Some(other) => Err(OtlpError::UnsupportedContentEncoding(other)),
    }
}

pub fn decode_body(body: &[u8], gzip: bool, max_bytes: usize) -> Result<Vec<u8>, OtlpError> {
    if body.len() > max_bytes {
        return Err(OtlpError::PayloadTooLarge);
    }

    if !gzip {
        return Ok(body.to_vec());
    }

    let mut decoder = GzDecoder::new(body);
    let mut out = Vec::new();
    let mut chunk = [0u8; 8192];
    loop {
        let read = decoder
            .read(&mut chunk)
            .map_err(|e| OtlpError::InvalidPayload(format!("gzip decode failed: {e}")))?;
        if read == 0 {
            break;
        }
        if out.len() + read > max_bytes {
            return Err(OtlpError::PayloadTooLarge);
        }
        out.extend_from_slice(&chunk[..read]);
    }
    Ok(out)
}

pub fn content_type_for(format: PayloadFormat) -> &'static str {
    match format {
        PayloadFormat::Protobuf => "application/x-protobuf",
        PayloadFormat::Json => "application/json",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_content_type_accepts_protobuf_aliases() {
        assert_eq!(
            parse_content_type(Some("application/x-protobuf")).unwrap(),
            PayloadFormat::Protobuf
        );
        assert_eq!(
            parse_content_type(Some("application/protobuf")).unwrap(),
            PayloadFormat::Protobuf
        );
    }

    #[test]
    fn parse_content_type_accepts_charset() {
        assert_eq!(
            parse_content_type(Some("application/json; charset=utf-8")).unwrap(),
            PayloadFormat::Json
        );
    }

    #[test]
    fn parse_content_encoding_identity() {
        assert!(!parse_content_encoding(Some("identity")).unwrap());
        assert!(!parse_content_encoding(None).unwrap());
    }

    #[test]
    fn decode_body_enforces_max_bytes_on_gzip_stream() {
        let mut encoder = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
        std::io::Write::write_all(&mut encoder, &[b'a'; 64]).unwrap();
        let gz = encoder.finish().unwrap();
        assert!(decode_body(&gz, true, 32).is_err());
    }
}

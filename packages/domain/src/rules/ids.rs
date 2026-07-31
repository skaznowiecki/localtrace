use thiserror::Error;

const TRACE_ID_LEN: usize = 32;
const SPAN_ID_LEN: usize = 16;

#[derive(Debug, Error)]
pub enum IdError {
    #[error("invalid trace id: {0}")]
    TraceId(String),
    #[error("invalid span id: {0}")]
    SpanId(String),
}

pub fn normalize_trace_id(input: &str) -> Result<String, IdError> {
    normalize_hex_id(input, TRACE_ID_LEN).map_err(IdError::TraceId)
}

pub fn normalize_span_id(input: &str) -> Result<String, IdError> {
    normalize_hex_id(input, SPAN_ID_LEN).map_err(IdError::SpanId)
}

pub fn normalize_trace_id_bytes(bytes: &[u8]) -> Result<String, IdError> {
    if bytes.len() != 16 {
        return Err(IdError::TraceId(format!("expected 16 bytes, got {}", bytes.len())));
    }
    if bytes.iter().all(|b| *b == 0) {
        return Err(IdError::TraceId("all-zero trace id".into()));
    }
    Ok(hex_encode(bytes))
}

pub fn normalize_span_id_bytes(bytes: &[u8]) -> Result<String, IdError> {
    if bytes.len() != 8 {
        return Err(IdError::SpanId(format!("expected 8 bytes, got {}", bytes.len())));
    }
    if bytes.iter().all(|b| *b == 0) {
        return Err(IdError::SpanId("all-zero span id".into()));
    }
    Ok(hex_encode(bytes))
}

pub fn optional_trace_id(input: &str) -> Option<String> {
    normalize_trace_id(input).ok()
}

pub fn optional_span_id(input: &str) -> Option<String> {
    normalize_span_id(input).ok()
}

pub fn optional_trace_id_bytes(bytes: &[u8]) -> Option<String> {
    if bytes.is_empty() {
        return None;
    }
    normalize_trace_id_bytes(bytes).ok()
}

pub fn optional_span_id_bytes(bytes: &[u8]) -> Option<String> {
    if bytes.is_empty() {
        return None;
    }
    normalize_span_id_bytes(bytes).ok()
}

pub fn is_root_parent(parent_span_id: Option<&str>) -> bool {
    match parent_span_id {
        None => true,
        Some(id) => id.is_empty(),
    }
}

fn normalize_hex_id(input: &str, expected_len: usize) -> Result<String, String> {
    let trimmed = input.trim();
    if trimmed.len() != expected_len {
        return Err(format!("expected {expected_len} hex chars, got {}", trimmed.len()));
    }
    if !trimmed.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err("non-hex character".into());
    }
    let lower = trimmed.to_ascii_lowercase();
    if lower.chars().all(|c| c == '0') {
        return Err("all-zero id".into());
    }
    Ok(lower)
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_uppercase_hex() {
        assert_eq!(
            normalize_trace_id("5B8EFFF798038103D269B633813FC60C").unwrap(),
            "5b8efff798038103d269b633813fc60c"
        );
    }

    #[test]
    fn rejects_all_zero() {
        assert!(normalize_span_id("0000000000000000").is_err());
    }
}

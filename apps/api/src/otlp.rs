use crate::state::AppState;
use axum::{
    body::Bytes,
    extract::State,
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::Response,
};
use common::AppError;
use adapter::otlp::{
    content_type_for, decode_body, map_logs_json, map_logs_protobuf, map_metrics_json,
    map_metrics_protobuf, map_traces_json, map_traces_protobuf, parse_content_encoding,
    parse_content_type, OtlpError, PayloadFormat,
};
use domain::{LogRecord, SpanRecord};
use opentelemetry_proto::tonic::collector::logs::v1::ExportLogsServiceResponse;
use opentelemetry_proto::tonic::collector::metrics::v1::ExportMetricsServiceResponse;
use opentelemetry_proto::tonic::collector::trace::v1::ExportTraceServiceResponse;
use prost::Message;
use serde::Serialize;
use serde_json::Value;
use std::time::Duration;
use tracing::{info, warn};

#[derive(Clone, PartialEq, ::prost::Message, Serialize)]
pub struct RpcStatus {
    #[prost(int32, tag = "1")]
    pub code: i32,
    #[prost(string, tag = "2")]
    pub message: String,
}

#[derive(Copy, Clone)]
enum Signal {
    Traces,
    Logs,
    Metrics,
}

#[derive(Debug)]
enum ExportError {
    Otlp(OtlpError),
    Storage(AppError),
}

impl From<OtlpError> for ExportError {
    fn from(err: OtlpError) -> Self {
        ExportError::Otlp(err)
    }
}

impl From<AppError> for ExportError {
    fn from(err: AppError) -> Self {
        ExportError::Storage(err)
    }
}

pub async fn export_traces(state: State<AppState>, headers: HeaderMap, body: Bytes) -> Response {
    handle_export(state, headers, body, Signal::Traces).await
}

pub async fn export_logs(state: State<AppState>, headers: HeaderMap, body: Bytes) -> Response {
    handle_export(state, headers, body, Signal::Logs).await
}

pub async fn export_metrics(state: State<AppState>, headers: HeaderMap, body: Bytes) -> Response {
    handle_export(state, headers, body, Signal::Metrics).await
}

async fn handle_export(state: State<AppState>, headers: HeaderMap, body: Bytes, signal: Signal) -> Response {
    let format = match parse_content_type(headers.get(header::CONTENT_TYPE).and_then(|v| v.to_str().ok())) {
        Ok(format) => format,
        Err(err) => {
            return otlp_error_response(PayloadFormat::Json, StatusCode::UNSUPPORTED_MEDIA_TYPE, &err)
        }
    };

    let gzip = match parse_content_encoding(headers.get(header::CONTENT_ENCODING).and_then(|v| v.to_str().ok())) {
        Ok(gzip) => gzip,
        Err(err) => return otlp_error_response(format, StatusCode::UNSUPPORTED_MEDIA_TYPE, &err),
    };

    let permit = match state.ingest_semaphore.clone().try_acquire_owned() {
        Ok(permit) => permit,
        Err(_) => {
            let mut response = otlp_error_response(
                format,
                StatusCode::TOO_MANY_REQUESTS,
                &OtlpError::Validation("ingest capacity exceeded".into()),
            );
            response
                .headers_mut()
                .insert(header::RETRY_AFTER, HeaderValue::from_static("1"));
            return response;
        }
    };

    let max_bytes = state.config.otlp_max_body_bytes;
    let spans = state.spans.clone();
    let logs = state.logs.clone();
    let metrics = state.metrics.clone();
    let body_vec = body.to_vec();
    let body_bytes = body_vec.len();

    info!(
        signal = signal_name(signal),
        format = ?format,
        gzip,
        body_bytes,
        "otlp export received"
    );

    let result = tokio::time::timeout(
        Duration::from_secs(30),
        tokio::task::spawn_blocking(move || -> Result<(), ExportError> {
            let _permit = permit;
            let decoded = decode_body(&body_vec, gzip, max_bytes)?;
            match signal {
                Signal::Traces => {
                    let records = match format {
                        PayloadFormat::Json => map_traces_json(&decoded)?,
                        PayloadFormat::Protobuf => map_traces_protobuf(&decoded)?,
                    };
                    log_span_batch(&records);
                    spans.ingest(&records)?;
                }
                Signal::Logs => {
                    let records = match format {
                        PayloadFormat::Json => map_logs_json(&decoded)?,
                        PayloadFormat::Protobuf => map_logs_protobuf(&decoded)?,
                    };
                    log_log_batch(&records);
                    logs.ingest(&records)?;
                }
                Signal::Metrics => {
                    let records = match format {
                        PayloadFormat::Json => map_metrics_json(&decoded)?,
                        PayloadFormat::Protobuf => map_metrics_protobuf(&decoded)?,
                    };
                    info!(signal = "metrics", count = records.len(), "otlp ingest batch");
                    metrics.ingest(&records)?;
                }
            }
            Ok(())
        }),
    )
    .await;

    match result {
        Ok(Ok(Ok(()))) => otlp_success_response(format, signal),
        Ok(Ok(Err(err))) => map_export_error(format, err),
        Ok(Err(_join)) => otlp_error_response(
            format,
            StatusCode::INTERNAL_SERVER_ERROR,
            &OtlpError::Validation("ingest task failed".into()),
        ),
        Err(_) => otlp_error_response(
            format,
            StatusCode::SERVICE_UNAVAILABLE,
            &OtlpError::Validation("ingest timed out".into()),
        ),
    }
}

fn map_export_error(format: PayloadFormat, err: ExportError) -> Response {
    match &err {
        ExportError::Otlp(e) => warn!(?format, error = %e, "otlp ingest failed"),
        ExportError::Storage(e) => warn!(?format, error = %e, "otlp ingest storage failed"),
    }
    match err {
        ExportError::Otlp(err) => map_otlp_error(format, err),
        ExportError::Storage(storage) => otlp_error_response(
            format,
            StatusCode::SERVICE_UNAVAILABLE,
            &OtlpError::Validation(storage.to_string()),
        ),
    }
}

fn map_otlp_error(format: PayloadFormat, err: OtlpError) -> Response {
    match err {
        OtlpError::UnsupportedMediaType(_) | OtlpError::UnsupportedContentEncoding(_) => {
            otlp_error_response(format, StatusCode::UNSUPPORTED_MEDIA_TYPE, &err)
        }
        OtlpError::PayloadTooLarge => {
            otlp_error_response(format, StatusCode::PAYLOAD_TOO_LARGE, &err)
        }
        OtlpError::InvalidPayload(_) | OtlpError::Validation(_) => {
            otlp_error_response(format, StatusCode::BAD_REQUEST, &err)
        }
    }
}

fn otlp_success_response(format: PayloadFormat, signal: Signal) -> Response {
    let content_type = content_type_for(format);
    let body = match (format, signal) {
        (PayloadFormat::Protobuf, Signal::Traces) => ExportTraceServiceResponse::default().encode_to_vec(),
        (PayloadFormat::Protobuf, Signal::Logs) => ExportLogsServiceResponse::default().encode_to_vec(),
        (PayloadFormat::Protobuf, Signal::Metrics) => ExportMetricsServiceResponse::default().encode_to_vec(),
        (PayloadFormat::Json, _) => b"{}".to_vec(),
    };

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, content_type)
        .body(axum::body::Body::from(body))
        .unwrap()
}

fn otlp_error_response(format: PayloadFormat, status: StatusCode, err: &OtlpError) -> Response {
    let content_type = content_type_for(format);
    let rpc = RpcStatus {
        code: status.as_u16() as i32,
        message: err.to_string(),
    };

    let body = match format {
        PayloadFormat::Protobuf => rpc.encode_to_vec(),
        PayloadFormat::Json => serde_json::to_vec(&rpc).unwrap_or_else(|_| br#"{"message":"error"}"#.to_vec()),
    };

    Response::builder()
        .status(status)
        .header(header::CONTENT_TYPE, content_type)
        .body(axum::body::Body::from(body))
        .unwrap()
}

fn signal_name(signal: Signal) -> &'static str {
    match signal {
        Signal::Traces => "traces",
        Signal::Logs => "logs",
        Signal::Metrics => "metrics",
    }
}

fn log_span_batch(records: &[SpanRecord]) {
    info!(signal = "traces", count = records.len(), "otlp ingest batch");
    for span in records {
        info!(
            service = %span.service_name,
            span = %span.name,
            trace_id = %span.trace_id,
            span_id = %span.span_id,
            resource = ?pick_otlp_attrs(
                &span.resource_attributes,
                &["service.namespace", "deployment.environment", "host.name"],
            ),
            attrs = ?pick_otlp_attrs(
                &span.attributes,
                &[
                    "http.method",
                    "http.route",
                    "http.target",
                    "http.status_code",
                    "rpc.system",
                    "rpc.method",
                    "rpc.service",
                    "db.system",
                    "url.path",
                ],
            ),
            duration_ms = span.duration_ns / 1_000_000,
            status_code = span.status_code,
            "ingest span"
        );
    }
}

fn log_log_batch(records: &[LogRecord]) {
    info!(signal = "logs", count = records.len(), "otlp ingest batch");
    for log in records {
        info!(
            service = %log.service_name,
            severity = ?log.severity_text,
            body = ?short_value(log.body_any.as_ref(), 120),
            trace_id = ?log.trace_id,
            span_id = ?log.span_id,
            resource = ?pick_otlp_attrs(
                &log.resource_attributes,
                &["service.namespace", "deployment.environment", "host.name"],
            ),
            attrs = ?pick_otlp_attrs(
                &log.attributes,
                &[
                    "log.logger",
                    "exception.type",
                    "exception.message",
                    "http.method",
                    "http.route",
                    "code.filepath",
                ],
            ),
            "ingest log"
        );
    }
}

fn pick_otlp_attrs(attrs: &Value, keys: &[&str]) -> Option<String> {
    let parts: Vec<String> = keys
        .iter()
        .filter_map(|key| otlp_attr_lookup(attrs, key).map(|value| format!("{key}={value}")))
        .collect();
    if parts.is_empty() {
        None
    } else {
        Some(parts.join(" "))
    }
}

fn otlp_attr_lookup(attrs: &Value, key: &str) -> Option<String> {
    let obj = attrs.as_object()?;
    flat_value_to_string(obj.get(key)?)
}

fn flat_value_to_string(value: &Value) -> Option<String> {
    match value {
        Value::Null => None,
        Value::String(s) => Some(s.clone()),
        Value::Bool(b) => Some(b.to_string()),
        Value::Number(n) => Some(n.to_string()),
        other => Some(other.to_string()),
    }
}

fn short_value(value: Option<&Value>, max_len: usize) -> Option<String> {
    let text = match value {
        Some(Value::String(s)) => s.clone(),
        Some(other) => other.to_string(),
        None => return None,
    };
    Some(if text.len() <= max_len {
        text
    } else {
        format!("{}…", &text[..max_len])
    })
}

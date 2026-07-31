use crate::otlp::error::OtlpError;
use crate::otlp::values::{any_value_to_json, key_values_to_json, service_name_from_resource};
use domain::{optional_span_id_bytes, optional_trace_id_bytes, LogRecord};
use opentelemetry_proto::tonic::collector::logs::v1::ExportLogsServiceRequest;
use prost::Message;
use uuid::Uuid;

pub fn map_logs(request: ExportLogsServiceRequest) -> Result<Vec<LogRecord>, OtlpError> {
    let mut out = Vec::new();

    for resource_logs in request.resource_logs {
        let resource = resource_logs.resource.as_ref();
        let resource_attributes = resource
            .map(|r| key_values_to_json(&r.attributes))
            .unwrap_or_else(|| serde_json::json!([]));
        let resource_dropped = resource.map(|r| r.dropped_attributes_count).unwrap_or(0);
        let resource_schema_url = None;
        let service_name = resource
            .map(|r| service_name_from_resource(&r.attributes))
            .unwrap_or_else(|| "unknown_service".into());

        for scope_logs in resource_logs.scope_logs {
            let scope = scope_logs.scope.as_ref();
            let scope_name = scope.map(|s| s.name.clone()).filter(|s| !s.is_empty());
            let scope_version = scope
                .map(|s| s.version.clone())
                .filter(|s| !s.is_empty());
            let scope_attributes = scope
                .map(|s| key_values_to_json(&s.attributes))
                .unwrap_or_else(|| serde_json::json!([]));
            let scope_dropped = scope.map(|s| s.dropped_attributes_count).unwrap_or(0);
            let scope_schema_url = None;

            for log in scope_logs.log_records {
                let body_any = log
                    .body
                    .as_ref()
                    .map(|v| any_value_to_json(Some(v)));

                out.push(LogRecord {
                    id: Uuid::new_v4().to_string(),
                    time_ns: log.time_unix_nano,
                    observed_time_ns: if log.observed_time_unix_nano == 0 {
                        None
                    } else {
                        Some(log.observed_time_unix_nano)
                    },
                    severity_number: if log.severity_number == 0 {
                        None
                    } else {
                        Some(log.severity_number as i32)
                    },
                    severity_text: if log.severity_text.is_empty() {
                        None
                    } else {
                        Some(log.severity_text)
                    },
                    body_any,
                    event_name: if log.event_name.is_empty() {
                        None
                    } else {
                        Some(log.event_name)
                    },
                    service_name: service_name.clone(),
                    resource_attributes: resource_attributes.clone(),
                    resource_dropped_attributes_count: resource_dropped,
                    resource_schema_url: resource_schema_url.clone(),
                    scope_name: scope_name.clone(),
                    scope_version: scope_version.clone(),
                    scope_attributes: scope_attributes.clone(),
                    scope_dropped_attributes_count: scope_dropped,
                    scope_schema_url: scope_schema_url.clone(),
                    attributes: key_values_to_json(&log.attributes),
                    dropped_attributes_count: log.dropped_attributes_count,
                    flags: log.flags,
                    trace_id: optional_trace_id_bytes(&log.trace_id),
                    span_id: optional_span_id_bytes(&log.span_id),
                });
            }
        }
    }

    Ok(out)
}

pub fn map_logs_json(body: &[u8]) -> Result<Vec<LogRecord>, OtlpError> {
    let request: ExportLogsServiceRequest = serde_json::from_slice(body)
        .map_err(|e| OtlpError::InvalidPayload(format!("json decode failed: {e}")))?;
    map_logs(request)
}

pub fn map_logs_protobuf(body: &[u8]) -> Result<Vec<LogRecord>, OtlpError> {
    let request = ExportLogsServiceRequest::decode(body)
        .map_err(|e| OtlpError::InvalidPayload(format!("protobuf decode failed: {e}")))?;
    map_logs(request)
}

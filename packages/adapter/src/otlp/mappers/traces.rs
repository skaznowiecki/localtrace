use crate::otlp::error::OtlpError;
use crate::otlp::values::{key_values_to_json, service_name_from_resource};
use domain::{
    normalize_span_id_bytes, normalize_trace_id_bytes, SpanRecord,
};
use opentelemetry_proto::tonic::collector::trace::v1::ExportTraceServiceRequest;
use opentelemetry_proto::tonic::trace::v1::{Span, Status};
use serde_json::json;

pub fn map_traces(request: ExportTraceServiceRequest) -> Result<Vec<SpanRecord>, OtlpError> {
    let mut out = Vec::new();

    for resource_spans in request.resource_spans {
        let resource = resource_spans.resource.as_ref();
        let resource_attributes = resource
            .map(|r| key_values_to_json(&r.attributes))
            .unwrap_or_else(|| json!([]));
        let resource_dropped = resource.map(|r| r.dropped_attributes_count).unwrap_or(0);
        let resource_schema_url = None;
        let service_name = resource
            .map(|r| service_name_from_resource(&r.attributes))
            .unwrap_or_else(|| "unknown_service".into());

        for scope_spans in resource_spans.scope_spans {
            let scope = scope_spans.scope.as_ref();
            let scope_name = scope.map(|s| s.name.clone()).filter(|s| !s.is_empty());
            let scope_version = scope
                .map(|s| s.version.clone())
                .filter(|s| !s.is_empty());
            let scope_attributes = scope
                .map(|s| key_values_to_json(&s.attributes))
                .unwrap_or_else(|| json!([]));
            let scope_dropped = scope.map(|s| s.dropped_attributes_count).unwrap_or(0);
            let scope_schema_url = None;

            for span in scope_spans.spans {
                out.push(map_span(
                    span,
                    service_name.clone(),
                    resource_attributes.clone(),
                    resource_dropped,
                    resource_schema_url.clone(),
                    scope_name.clone(),
                    scope_version.clone(),
                    scope_attributes.clone(),
                    scope_dropped,
                    scope_schema_url.clone(),
                )?);
            }
        }
    }

    Ok(out)
}

fn map_span(
    span: Span,
    service_name: String,
    resource_attributes: serde_json::Value,
    resource_dropped_attributes_count: u32,
    resource_schema_url: Option<String>,
    scope_name: Option<String>,
    scope_version: Option<String>,
    scope_attributes: serde_json::Value,
    scope_dropped_attributes_count: u32,
    scope_schema_url: Option<String>,
) -> Result<SpanRecord, OtlpError> {
    let trace_id = normalize_trace_id_bytes(&span.trace_id)
        .map_err(|e| OtlpError::Validation(e.to_string()))?;
    let span_id = normalize_span_id_bytes(&span.span_id)
        .map_err(|e| OtlpError::Validation(e.to_string()))?;

    let parent_span_id = if span.parent_span_id.is_empty() {
        None
    } else {
        Some(
            normalize_span_id_bytes(&span.parent_span_id)
                .map_err(|e| OtlpError::Validation(e.to_string()))?,
        )
    };

    let end_time_ns = if span.end_time_unix_nano == 0 {
        span.start_time_unix_nano
    } else {
        span.end_time_unix_nano
    };
    let duration_ns = end_time_ns.saturating_sub(span.start_time_unix_nano);

    let status = span.status.unwrap_or(Status {
        message: String::new(),
        code: 0,
    });

    let events = json!(span.events.iter().map(|event| {
        json!({
            "timeUnixNano": event.time_unix_nano.to_string(),
            "name": event.name,
            "attributes": key_values_to_json(&event.attributes),
            "droppedAttributesCount": event.dropped_attributes_count,
        })
    }).collect::<Vec<_>>());

    let links = json!(span.links.iter().map(|link| {
        let trace_id = normalize_trace_id_bytes(&link.trace_id).ok();
        let span_id = normalize_span_id_bytes(&link.span_id).ok();
        json!({
            "traceId": trace_id,
            "spanId": span_id,
            "traceState": link.trace_state,
            "attributes": key_values_to_json(&link.attributes),
            "droppedAttributesCount": link.dropped_attributes_count,
            "flags": link.flags,
        })
    }).collect::<Vec<_>>());

    Ok(SpanRecord {
        trace_id,
        span_id,
        parent_span_id,
        name: span.name,
        kind: span.kind,
        start_time_ns: span.start_time_unix_nano,
        end_time_ns,
        duration_ns,
        status_code: status.code,
        status_message: if status.message.is_empty() {
            None
        } else {
            Some(status.message)
        },
        trace_state: if span.trace_state.is_empty() {
            None
        } else {
            Some(span.trace_state)
        },
        flags: span.flags,
        dropped_attributes_count: span.dropped_attributes_count,
        dropped_events_count: span.dropped_events_count,
        dropped_links_count: span.dropped_links_count,
        service_name,
        resource_attributes,
        resource_dropped_attributes_count,
        resource_schema_url,
        scope_name,
        scope_version,
        scope_attributes,
        scope_dropped_attributes_count,
        scope_schema_url,
        attributes: key_values_to_json(&span.attributes),
        events,
        links,
    })
}

pub fn map_traces_json(body: &[u8]) -> Result<Vec<SpanRecord>, OtlpError> {
    let request: ExportTraceServiceRequest = serde_json::from_slice(body)
        .map_err(|e| OtlpError::InvalidPayload(format!("json decode failed: {e}")))?;
    map_traces(request)
}

pub fn map_traces_protobuf(body: &[u8]) -> Result<Vec<SpanRecord>, OtlpError> {
    let request = ExportTraceServiceRequest::decode(body)
        .map_err(|e| OtlpError::InvalidPayload(format!("protobuf decode failed: {e}")))?;
    map_traces(request)
}

// Re-export prost Message trait usage
use prost::Message;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_all_zero_trace_id_in_json() {
        let payload = br#"{"resourceSpans":[{"scopeSpans":[{"spans":[{"traceId":"00000000000000000000000000000000","spanId":"EEE19B7EC3C1B174","name":"x","startTimeUnixNano":"1","endTimeUnixNano":"2"}]}]}]}"#;
        assert!(map_traces_json(payload).is_err());
    }

    #[test]
    fn accepts_uppercase_hex_in_json() {
        let payload = br#"{"resourceSpans":[{"resource":{"attributes":[{"key":"service.name","value":{"stringValue":"demo"}}]},"scopeSpans":[{"spans":[{"traceId":"5B8EFFF798038103D269B633813FC60C","spanId":"EEE19B7EC3C1B174","name":"GET /users","kind":1,"startTimeUnixNano":"1544712660000000000","endTimeUnixNano":"1544712661000000000","status":{}}]}]}]}"#;
        let spans = map_traces_json(payload).expect("valid payload");
        assert_eq!(spans.len(), 1);
        assert_eq!(spans[0].trace_id, "5b8efff798038103d269b633813fc60c");
    }
}

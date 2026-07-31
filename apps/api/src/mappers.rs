use crate::dto::{
    LogDto, RouteFacetDto, ServiceCard, SpanDto, TraceCard, TraceDetailDto, TraceFacetsDto,
};
use chrono::{TimeZone, Utc};
use common::nest_dotted_keys;
use domain::{LogRecord, ServiceSummary, SpanRecord, TraceSummary};
use engine::TraceFacets;
use serde_json::Value;

pub fn trace_card(trace: &TraceSummary) -> TraceCard {
    TraceCard {
        id: trace.trace_id.clone(),
        service: trace
            .root_service
            .clone()
            .unwrap_or_else(|| "unknown_service".into()),
        root_service: trace
            .root_service
            .clone()
            .unwrap_or_else(|| "unknown_service".into()),
        name: trace.root_name.clone().unwrap_or_else(|| "unknown".into()),
        duration_ms: trace.duration_ms(),
        span_count: trace.span_count,
        status: trace.status.as_str().to_string(),
        http_status_code: trace.http_status_code,
        http_url: trace.http_url.clone(),
        start_time: ns_to_rfc3339(trace.start_time_ns),
    }
}

pub fn trace_facets(facets: &TraceFacets) -> TraceFacetsDto {
    TraceFacetsDto {
        services: facets.services.clone(),
        statuses: facets.statuses.clone(),
        methods: facets.methods.clone(),
        http_status_codes: facets.http_status_codes.clone(),
        routes: facets
            .routes
            .iter()
            .map(|route| RouteFacetDto {
                value: route.value.clone(),
                count: route.count,
            })
            .collect(),
    }
}

fn span_status(status_code: i32) -> &'static str {
    match status_code {
        2 => "error",
        1 => "ok",
        _ => "unset",
    }
}

pub fn span_dto(span: &SpanRecord, trace_start_ns: u64) -> SpanDto {
    let start_offset_ns = span.start_time_ns.saturating_sub(trace_start_ns);

    SpanDto {
        id: span.span_id.clone(),
        parent_id: span.parent_span_id.clone(),
        name: span.name.clone(),
        service: if span.service_name.is_empty() {
            "unknown_service".into()
        } else {
            span.service_name.clone()
        },
        kind: span.kind,
        status: span_status(span.status_code).to_string(),
        status_message: span.status_message.clone(),
        start_offset_ms: start_offset_ns as f64 / 1_000_000.0,
        duration_ms: span.duration_ns as f64 / 1_000_000.0,
        attributes: nest_dotted_keys(&span.attributes),
        events: nest_dotted_keys(&span.events),
        links: nest_dotted_keys(&span.links),
        resource_attributes: nest_dotted_keys(&span.resource_attributes),
        scope_name: span.scope_name.clone(),
        scope_version: span.scope_version.clone(),
    }
}

pub fn trace_detail(trace: &TraceSummary, spans: &[SpanRecord]) -> TraceDetailDto {
    let trace_start_ns = trace.start_time_ns;

    TraceDetailDto {
        trace: trace_card(trace),
        spans: spans
            .iter()
            .map(|span| span_dto(span, trace_start_ns))
            .collect(),
    }
}

pub fn service_card(service: &ServiceSummary) -> ServiceCard {
    ServiceCard {
        name: service.name.clone(),
        trace_count: service.trace_count,
    }
}

pub fn log_dto(log: &LogRecord) -> LogDto {
    LogDto {
        id: log.id.clone(),
        time: ns_to_rfc3339(log.time_ns),
        severity_number: log.severity_number,
        severity_text: log.severity_text.clone(),
        body: log.body_any.clone().unwrap_or(Value::Null),
        service_name: if log.service_name.is_empty() {
            "unknown_service".into()
        } else {
            log.service_name.clone()
        },
        attributes: nest_dotted_keys(&log.attributes),
        scope_name: log.scope_name.clone(),
        scope_version: log.scope_version.clone(),
        trace_id: log.trace_id.clone(),
        span_id: log.span_id.clone(),
    }
}

fn ns_to_rfc3339(ns: u64) -> String {
    let secs = (ns / 1_000_000_000) as i64;
    let nanos = (ns % 1_000_000_000) as u32;
    Utc.timestamp_opt(secs, nanos)
        .single()
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_else(|| Utc::now().to_rfc3339())
}

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpanRecord {
    pub trace_id: String,
    pub span_id: String,
    pub parent_span_id: Option<String>,
    pub name: String,
    pub kind: i32,
    pub start_time_ns: u64,
    pub end_time_ns: u64,
    pub duration_ns: u64,
    pub status_code: i32,
    pub status_message: Option<String>,
    pub trace_state: Option<String>,
    pub flags: u32,
    pub dropped_attributes_count: u32,
    pub dropped_events_count: u32,
    pub dropped_links_count: u32,
    pub service_name: String,
    pub resource_attributes: Value,
    pub resource_dropped_attributes_count: u32,
    pub resource_schema_url: Option<String>,
    pub scope_name: Option<String>,
    pub scope_version: Option<String>,
    pub scope_attributes: Value,
    pub scope_dropped_attributes_count: u32,
    pub scope_schema_url: Option<String>,
    pub attributes: Value,
    pub events: Value,
    pub links: Value,
}

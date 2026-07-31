use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogRecord {
    pub id: String,
    pub time_ns: u64,
    pub observed_time_ns: Option<u64>,
    pub severity_number: Option<i32>,
    pub severity_text: Option<String>,
    pub body_any: Option<Value>,
    pub event_name: Option<String>,
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
    pub dropped_attributes_count: u32,
    pub flags: u32,
    pub trace_id: Option<String>,
    pub span_id: Option<String>,
}

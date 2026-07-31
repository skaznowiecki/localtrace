use crate::value_objects::TraceStatus;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraceSummary {
    pub trace_id: String,
    pub root_span_id: Option<String>,
    pub root_observed: bool,
    pub root_service: Option<String>,
    pub root_name: Option<String>,
    pub start_time_ns: u64,
    pub end_time_ns: u64,
    pub duration_ns: u64,
    pub status: TraceStatus,
    pub span_count: u32,
    pub http_method: Option<String>,
    pub http_status_code: Option<i32>,
    pub http_url: Option<String>,
    /// Normalized route pattern (`/users/:id`) for grouping/faceting. Derived
    /// from `http_url` at ingest via `normalize_route_path`.
    pub http_route: Option<String>,
}

impl TraceSummary {
    pub fn duration_ms(&self) -> i64 {
        (self.duration_ns / 1_000_000) as i64
    }
}

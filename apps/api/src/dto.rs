use serde::Serialize;
use serde_json::Value;

#[derive(Debug, Clone, Serialize)]
pub struct TraceCard {
    pub id: String,
    pub service: String,
    pub root_service: String,
    pub name: String,
    pub duration_ms: i64,
    pub span_count: u32,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub http_status_code: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub http_url: Option<String>,
    pub start_time: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct TraceFacetsDto {
    pub services: Vec<String>,
    pub statuses: Vec<String>,
    pub methods: Vec<String>,
    pub http_status_codes: Vec<i32>,
    pub routes: Vec<RouteFacetDto>,
}

#[derive(Debug, Clone, Serialize)]
pub struct RouteFacetDto {
    pub value: String,
    pub count: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct SpanDto {
    pub id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub service: String,
    pub kind: i32,
    pub status: String,
    pub status_message: Option<String>,
    pub start_offset_ms: f64,
    pub duration_ms: f64,
    pub attributes: Value,
    pub events: Value,
    pub links: Value,
    pub resource_attributes: Value,
    pub scope_name: Option<String>,
    pub scope_version: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TraceDetailDto {
    pub trace: TraceCard,
    pub spans: Vec<SpanDto>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ServiceCard {
    pub name: String,
    pub trace_count: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct LogDto {
    pub id: String,
    pub time: String,
    pub severity_number: Option<i32>,
    pub severity_text: Option<String>,
    pub body: Value,
    pub service_name: String,
    pub attributes: Value,
    pub scope_name: Option<String>,
    pub scope_version: Option<String>,
    pub trace_id: Option<String>,
    pub span_id: Option<String>,
}

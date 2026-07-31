use crate::mappers::{log_dto, service_card, trace_card, trace_detail, trace_facets};
use crate::state::AppState;
use crate::dto::{LogDto, ServiceCard, TraceCard, TraceDetailDto, TraceFacetsDto};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::DateTime;
use common::AppError;
use domain::normalize_trace_id;
use engine::TraceListFilters;
use serde::Deserialize;
use std::sync::Arc;

pub async fn health() -> impl IntoResponse {
    Json(serde_json::json!({ "status": "ok" }))
}

#[derive(Debug, Deserialize)]
pub struct ListTracesQuery {
    #[serde(default = "default_limit")]
    pub limit: u32,
    pub service: Option<String>,
    pub status: Option<String>,
    pub method: Option<String>,
    pub http_status_code: Option<i32>,
    pub name: Option<String>,
    pub url: Option<String>,
    pub duration_min_ns: Option<u64>,
    pub duration_max_ns: Option<u64>,
    /// RFC3339 timestamp — only traces with `start_time >= since`.
    pub since: Option<String>,
}

fn default_limit() -> u32 {
    50
}

fn parse_since_ns(since: Option<String>) -> Result<Option<u64>, ApiError> {
    let Some(raw) = since.filter(|s| !s.is_empty()) else {
        return Ok(None);
    };
    let dt = DateTime::parse_from_rfc3339(&raw)
        .map_err(|e| ApiError::BadRequest(format!("invalid since (expected RFC3339): {e}")))?;
    if dt.timestamp() < 0 {
        return Err(ApiError::BadRequest(
            "invalid since: timestamp must be non-negative".into(),
        ));
    }
    let ns = (dt.timestamp() as u64)
        .saturating_mul(1_000_000_000)
        .saturating_add(u64::from(dt.timestamp_subsec_nanos()));
    Ok(Some(ns))
}

fn to_filters(query: ListTracesQuery) -> Result<TraceListFilters, ApiError> {
    Ok(TraceListFilters {
        limit: query.limit,
        service: query.service.filter(|s| !s.is_empty()),
        status: query.status.filter(|s| !s.is_empty()),
        method: query.method.filter(|s| !s.is_empty()),
        http_status_code: query.http_status_code,
        name: query.name.filter(|s| !s.is_empty()),
        url: query.url.filter(|s| !s.is_empty()),
        duration_min_ns: query.duration_min_ns,
        duration_max_ns: query.duration_max_ns,
        since_ns: parse_since_ns(query.since)?,
    })
}

pub async fn list_traces(
    State(state): State<AppState>,
    Query(query): Query<ListTracesQuery>,
) -> Result<Json<Vec<TraceCard>>, ApiError> {
    let repos = Arc::clone(&state.repos);
    let filters = to_filters(query)?;
    let traces = tokio::task::spawn_blocking(move || repos.traces.list(filters))
        .await
        .map_err(|e| ApiError::Internal(e.to_string()))??;

    Ok(Json(traces.iter().map(trace_card).collect()))
}

pub async fn list_trace_facets(
    State(state): State<AppState>,
) -> Result<Json<TraceFacetsDto>, ApiError> {
    let repos = Arc::clone(&state.repos);
    let facets = tokio::task::spawn_blocking(move || repos.traces.facets())
        .await
        .map_err(|e| ApiError::Internal(e.to_string()))??;

    Ok(Json(trace_facets(&facets)))
}

pub async fn get_trace(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<TraceDetailDto>, ApiError> {
    let trace_id = normalize_trace_id(&id).map_err(|e| ApiError::BadRequest(e.to_string()))?;
    let repos = Arc::clone(&state.repos);

    let result = tokio::task::spawn_blocking(move || repos.traces.get_with_spans(&trace_id))
        .await
        .map_err(|e| ApiError::Internal(e.to_string()))??;

    let Some((trace, spans)) = result else {
        return Err(ApiError::NotFound(format!("trace {id} not found")));
    };

    Ok(Json(trace_detail(&trace, &spans)))
}

pub async fn get_trace_logs(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Vec<LogDto>>, ApiError> {
    let trace_id = normalize_trace_id(&id).map_err(|e| ApiError::BadRequest(e.to_string()))?;
    let repos = Arc::clone(&state.repos);

    let logs = tokio::task::spawn_blocking(move || repos.logs.list_for_trace(&trace_id))
        .await
        .map_err(|e| ApiError::Internal(e.to_string()))??;

    Ok(Json(logs.iter().map(log_dto).collect()))
}

pub async fn list_services(
    State(state): State<AppState>,
) -> Result<Json<Vec<ServiceCard>>, ApiError> {
    let repos = Arc::clone(&state.repos);
    let services = tokio::task::spawn_blocking(move || repos.services.list())
        .await
        .map_err(|e| ApiError::Internal(e.to_string()))??;

    Ok(Json(services.iter().map(service_card).collect()))
}

#[derive(Debug)]
pub enum ApiError {
    BadRequest(String),
    NotFound(String),
    Internal(String),
}

impl From<AppError> for ApiError {
    fn from(err: AppError) -> Self {
        match err {
            AppError::NotFound(msg) => ApiError::NotFound(msg),
            AppError::InvalidInput(msg) => ApiError::BadRequest(msg),
            other => ApiError::Internal(other.to_string()),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match self {
            ApiError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            ApiError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            ApiError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };

        (status, Json(serde_json::json!({ "error": message }))).into_response()
    }
}

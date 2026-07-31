pub mod dto;
pub mod mappers;
pub mod otlp;
pub mod routes;
pub mod state;

use axum::{
    extract::DefaultBodyLimit,
    routing::{get, post},
    Router,
};
use state::AppState;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

pub fn build_app(state: AppState) -> Router {
    let max_body = state.config.otlp_max_body_bytes;

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let read_router = Router::new()
        .route("/health", get(routes::health))
        .route("/api/traces", get(routes::list_traces))
        .route("/api/traces/facets", get(routes::list_trace_facets))
        .route("/api/traces/{id}", get(routes::get_trace))
        .route("/api/traces/{id}/logs", get(routes::get_trace_logs))
        .route("/api/services", get(routes::list_services))
        .with_state(state.clone());

    let otlp_router = Router::new()
        .route("/v1/traces", post(otlp::export_traces))
        .route("/v1/logs", post(otlp::export_logs))
        .route("/v1/metrics", post(otlp::export_metrics))
        .layer(DefaultBodyLimit::max(max_body))
        .with_state(state);

    read_router
        .merge(otlp_router)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
}

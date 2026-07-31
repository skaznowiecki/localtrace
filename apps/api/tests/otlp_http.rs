use api::{build_app, state::AppState};
use axum::{
    body::Body,
    http::{header, Request, StatusCode},
};
use common::Config;
use engine::Repositories;
use flate2::write::GzEncoder;
use flate2::Compression;
use http_body_util::BodyExt;
use opentelemetry_proto::tonic::collector::trace::v1::{
    ExportTraceServiceRequest, ExportTraceServiceResponse,
};
use prost::Message;
use std::io::Write;
use tower::ServiceExt;

const TRACE_JSON: &str = r#"{"resourceSpans":[{"resource":{"attributes":[{"key":"service.name","value":{"stringValue":"demo"}}]},"scopeSpans":[{"spans":[{"traceId":"5B8EFFF798038103D269B633813FC60C","spanId":"EEE19B7EC3C1B174","name":"GET /users","kind":1,"startTimeUnixNano":"1544712660000000000","endTimeUnixNano":"1544712661000000000","status":{}}]}]}]}"#;

const EMPTY_JSON: &str = r#"{"resourceSpans":[]}"#;

fn test_state(max_body_bytes: usize) -> (AppState, String) {
    let path = std::env::temp_dir().join(format!(
        "local-tracer-api-test-{}.db",
        uuid::Uuid::new_v4()
    ));
    let path_str = path.to_string_lossy().into_owned();
    let repos = Repositories::open(&path_str).expect("engine init");
    let config = Config {
        database_path: path_str.clone(),
        api_port: 4318,
        log_level: "error".into(),
        otlp_max_body_bytes: max_body_bytes,
        otlp_max_in_flight: 4,
    };
    (AppState::new(repos, config), path_str)
}

async fn response_body(response: axum::response::Response) -> Vec<u8> {
    response.into_body().collect().await.unwrap().to_bytes().to_vec()
}

#[tokio::test]
async fn otlp_json_empty_trace_export_succeeds() {
    let (state, _path) = test_state(1024 * 1024);
    let app = build_app(state);

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/traces")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(EMPTY_JSON))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.headers().get(header::CONTENT_TYPE).unwrap(),
        "application/json"
    );
    assert_eq!(response_body(response).await, b"{}");
}

#[tokio::test]
async fn otlp_json_trace_ingest_and_read_back() {
    let (state, _path) = test_state(1024 * 1024);
    let app = build_app(state);

    let ingest = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/traces")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(TRACE_JSON))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(ingest.status(), StatusCode::OK);

    let list = app
        .oneshot(
            Request::builder()
                .uri("/api/traces")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(list.status(), StatusCode::OK);
    let body = String::from_utf8(response_body(list).await).unwrap();
    assert!(body.contains("5b8efff798038103d269b633813fc60c"));
    assert!(body.contains("GET /users"));
}

#[tokio::test]
async fn otlp_protobuf_empty_trace_export_succeeds() {
    let (state, _path) = test_state(1024 * 1024);
    let app = build_app(state);
    let payload = ExportTraceServiceRequest::default().encode_to_vec();

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/traces")
                .header(header::CONTENT_TYPE, "application/x-protobuf")
                .body(Body::from(payload))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.headers().get(header::CONTENT_TYPE).unwrap(),
        "application/x-protobuf"
    );
    let body = response_body(response).await;
    assert!(ExportTraceServiceResponse::decode(body.as_slice()).is_ok());
}

#[tokio::test]
async fn otlp_gzip_json_trace_export_succeeds() {
    let (state, _path) = test_state(1024 * 1024);
    let app = build_app(state);

    let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(EMPTY_JSON.as_bytes()).unwrap();
    let gzipped = encoder.finish().unwrap();

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/traces")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::CONTENT_ENCODING, "gzip")
                .body(Body::from(gzipped))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn otlp_rejects_unsupported_media_type() {
    let (state, _path) = test_state(1024 * 1024);
    let app = build_app(state);

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/traces")
                .header(header::CONTENT_TYPE, "text/plain")
                .body(Body::from("hello"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNSUPPORTED_MEDIA_TYPE);
}

#[tokio::test]
async fn otlp_rejects_unsupported_content_encoding() {
    let (state, _path) = test_state(1024 * 1024);
    let app = build_app(state);

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/traces")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::CONTENT_ENCODING, "br")
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNSUPPORTED_MEDIA_TYPE);
}

#[tokio::test]
async fn otlp_rejects_invalid_json_payload() {
    let (state, _path) = test_state(1024 * 1024);
    let app = build_app(state);

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/traces")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from("{not-json"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn otlp_rejects_payload_too_large() {
    let (state, _path) = test_state(32);
    let app = build_app(state);

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/traces")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(TRACE_JSON))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE);
}

#[tokio::test]
async fn otlp_logs_and_metrics_empty_export_succeed() {
    let (state, _path) = test_state(1024 * 1024);
    let app = build_app(state);

    for path in ["/v1/logs", "/v1/metrics"] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(path)
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(if path.ends_with("logs") {
                        r#"{"resourceLogs":[]}"#
                    } else {
                        r#"{"resourceMetrics":[]}"#
                    }))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK, "path {path}");
    }
}

#[tokio::test]
async fn concurrent_otlp_exports_do_not_panic() {
    let (state, _path) = test_state(1024 * 1024);
    let app = build_app(state);

    let mut handles = Vec::new();
    for i in 0..8 {
        let app = app.clone();
        handles.push(tokio::spawn(async move {
            let span_id = format!("{:016x}", i + 1);
            let payload = format!(
                r#"{{"resourceSpans":[{{"resource":{{"attributes":[{{"key":"service.name","value":{{"stringValue":"demo"}}}}]}},"scopeSpans":[{{"spans":[{{"traceId":"5B8EFFF798038103D269B633813FC60C","spanId":"{span_id}","name":"span-{i}","kind":1,"startTimeUnixNano":"1544712660000000000","endTimeUnixNano":"1544712661000000000","status":{{}}}}]}}]}}]}}"#
            );
            app.oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/v1/traces")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(payload))
                    .unwrap(),
            )
            .await
            .unwrap()
            .status()
        }));
    }

    for handle in handles {
        let status = handle.await.unwrap();
        assert!(status == StatusCode::OK || status == StatusCode::TOO_MANY_REQUESTS);
    }
}

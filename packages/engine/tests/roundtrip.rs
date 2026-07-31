use domain::SpanRecord;
use engine::Repositories;
use serde_json::json;

const TRACE_ID: &str = "5b8efff798038103d269b633813fc60c";
const SPAN_ID: &str = "eee19b7ec3c1b174";

#[test]
fn insert_and_read_trace_roundtrip() {
    let path = std::env::temp_dir().join(format!(
        "local-tracer-test-{}.db",
        uuid::Uuid::new_v4()
    ));
    let repos = Repositories::open(path.to_str().unwrap()).expect("engine init");

    let span = sample_span();

    repos.spans.insert(&[span]).expect("insert spans");

    let traces = repos
        .traces
        .list(engine::TraceListFilters {
            limit: 10,
            ..Default::default()
        })
        .expect("list traces");
    assert_eq!(traces.len(), 1);
    assert_eq!(traces[0].trace_id, TRACE_ID);
    assert_eq!(traces[0].span_count, 1);
    assert_eq!(traces[0].http_method.as_deref(), Some("GET"));
    assert_eq!(traces[0].http_status_code, Some(200));

    let detail = repos.traces.get_with_spans(TRACE_ID).expect("get trace");
    let (loaded_trace, loaded_spans) = detail.expect("trace exists");
    assert_eq!(loaded_trace.root_name.as_deref(), Some("GET /health"));
    assert_eq!(loaded_spans.len(), 1);
    assert_eq!(loaded_spans[0].span_id, SPAN_ID);

    let _ = std::fs::remove_file(path);
}

#[test]
fn span_upsert_is_idempotent() {
    let path = std::env::temp_dir().join(format!(
        "local-tracer-test-{}.db",
        uuid::Uuid::new_v4()
    ));
    let repos = Repositories::open(path.to_str().unwrap()).expect("engine init");

    let mut span = sample_span();
    repos.spans.insert(&[span.clone()]).expect("insert");
    span.name = "GET /health updated".into();
    repos.spans.insert(&[span]).expect("upsert");

    let detail = repos.traces.get_with_spans(TRACE_ID).expect("get trace");
    let (_, spans) = detail.expect("trace exists");
    assert_eq!(spans.len(), 1);
    assert_eq!(spans[0].name, "GET /health updated");

    let _ = std::fs::remove_file(path);
}

#[test]
fn list_traces_filters_by_since_ns() {
    let path = std::env::temp_dir().join(format!(
        "local-tracer-test-since-{}.db",
        uuid::Uuid::new_v4()
    ));
    let repos = Repositories::open(path.to_str().unwrap()).expect("engine init");

    let mut older = sample_span();
    older.start_time_ns = 1_000_000_000_000_000_000;
    older.end_time_ns = 1_000_000_001_000_000_000;
    older.duration_ns = 1_000_000_000;

    let mut newer = sample_span();
    newer.trace_id = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa".into();
    newer.span_id = "bbbbbbbbbbbbbbbb".into();
    newer.start_time_ns = 1_700_000_000_000_000_000;
    newer.end_time_ns = 1_700_000_001_000_000_000;
    newer.duration_ns = 1_000_000_000;

    repos
        .spans
        .insert(&[older, newer])
        .expect("insert spans");

    let all = repos
        .traces
        .list(engine::TraceListFilters {
            limit: 10,
            ..Default::default()
        })
        .expect("list all");
    assert_eq!(all.len(), 2);

    let filtered = repos
        .traces
        .list(engine::TraceListFilters {
            limit: 10,
            since_ns: Some(1_600_000_000_000_000_000),
            ..Default::default()
        })
        .expect("list since");
    assert_eq!(filtered.len(), 1);
    assert_eq!(filtered[0].trace_id, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");

    let _ = std::fs::remove_file(path);
}

fn sample_span() -> SpanRecord {
    SpanRecord {
        trace_id: TRACE_ID.into(),
        span_id: SPAN_ID.into(),
        parent_span_id: None,
        name: "GET /health".into(),
        kind: 1,
        start_time_ns: 1_544_712_660_000_000_000,
        end_time_ns: 1_544_712_661_000_000_000,
        duration_ns: 1_000_000_000,
        status_code: 1,
        status_message: None,
        trace_state: None,
        flags: 0,
        dropped_attributes_count: 0,
        dropped_events_count: 0,
        dropped_links_count: 0,
        service_name: "test-service".into(),
        resource_attributes: json!({"service.name": "test-service"}),
        resource_dropped_attributes_count: 0,
        resource_schema_url: None,
        scope_name: Some("test-scope".into()),
        scope_version: None,
        scope_attributes: json!([]),
        scope_dropped_attributes_count: 0,
        scope_schema_url: None,
        attributes: json!({
            "http": {
                "request": { "method": "GET" },
                "response": { "status_code": 200 }
            }
        }),
        events: json!([]),
        links: json!([]),
    }
}

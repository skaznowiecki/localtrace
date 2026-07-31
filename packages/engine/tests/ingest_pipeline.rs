use engine::Repositories;
use adapter::otlp::map_traces_json;

const TRACE_JSON: &[u8] = br#"{"resourceSpans":[{"resource":{"attributes":[{"key":"service.name","value":{"stringValue":"demo"}}]},"scopeSpans":[{"spans":[{"traceId":"5B8EFFF798038103D269B633813FC60C","spanId":"EEE19B7EC3C1B174","name":"GET /users","kind":1,"startTimeUnixNano":"1544712660000000000","endTimeUnixNano":"1544712661000000000","status":{}}]}]}]}"#;

#[test]
fn ingest_mapped_trace_json_roundtrip() {
    let path = std::env::temp_dir().join(format!(
        "local-tracer-ingest-test-{}.db",
        uuid::Uuid::new_v4()
    ));
    let repos = Repositories::open(path.to_str().unwrap()).expect("engine init");
    let spans = map_traces_json(TRACE_JSON).expect("map traces");
    repos.spans.insert(&spans).expect("insert spans");
    let traces = repos
        .traces
        .list(engine::TraceListFilters {
            limit: 10,
            ..Default::default()
        })
        .expect("list traces");
    assert_eq!(traces.len(), 1);
    assert_eq!(traces[0].trace_id, "5b8efff798038103d269b633813fc60c");
    assert_eq!(traces[0].http_method.as_deref(), Some("GET"));
    let _ = std::fs::remove_file(path);
}

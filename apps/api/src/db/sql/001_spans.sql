CREATE TABLE IF NOT EXISTS spans (
    trace_id            VARCHAR NOT NULL,
    span_id             VARCHAR NOT NULL,
    parent_span_id      VARCHAR,
    name                VARCHAR NOT NULL,
    kind                INTEGER NOT NULL,
    start_time_ns       UBIGINT NOT NULL,
    end_time_ns         UBIGINT NOT NULL,
    duration_ns         UBIGINT NOT NULL,
    status_code         INTEGER NOT NULL,
    status_message      VARCHAR,
    trace_state         VARCHAR,
    flags               UBIGINT NOT NULL,
    dropped_attributes_count UBIGINT NOT NULL,
    dropped_events_count     UBIGINT NOT NULL,
    dropped_links_count      UBIGINT NOT NULL,
    service_name        VARCHAR NOT NULL,
    resource_attributes JSON,
    resource_dropped_attributes_count UBIGINT NOT NULL,
    resource_schema_url VARCHAR,
    scope_name          VARCHAR,
    scope_version       VARCHAR,
    scope_attributes    JSON,
    scope_dropped_attributes_count UBIGINT NOT NULL,
    scope_schema_url    VARCHAR,
    attributes          JSON,
    events              JSON,
    links               JSON,
    received_at         TIMESTAMP NOT NULL DEFAULT current_timestamp,
    PRIMARY KEY (trace_id, span_id)
);

CREATE INDEX IF NOT EXISTS idx_spans_trace ON spans (trace_id);
CREATE INDEX IF NOT EXISTS idx_spans_service_time ON spans (service_name, start_time_ns);

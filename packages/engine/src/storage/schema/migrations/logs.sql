CREATE TABLE IF NOT EXISTS logs (
    id                   VARCHAR PRIMARY KEY,
    time_ns              UBIGINT NOT NULL,
    observed_time_ns     UBIGINT,
    severity_number      INTEGER,
    severity_text        VARCHAR,
    body_any             JSON,
    event_name           VARCHAR,
    service_name         VARCHAR,
    resource_attributes  JSON,
    resource_dropped_attributes_count UBIGINT NOT NULL,
    resource_schema_url  VARCHAR,
    scope_name           VARCHAR,
    scope_version        VARCHAR,
    scope_attributes     JSON,
    scope_dropped_attributes_count UBIGINT NOT NULL,
    scope_schema_url     VARCHAR,
    attributes           JSON,
    dropped_attributes_count UBIGINT NOT NULL,
    flags                UBIGINT NOT NULL,
    trace_id             VARCHAR,
    span_id              VARCHAR,
    received_at          TIMESTAMP NOT NULL DEFAULT current_timestamp
);

CREATE INDEX IF NOT EXISTS idx_logs_time ON logs (time_ns DESC);
CREATE INDEX IF NOT EXISTS idx_logs_trace ON logs (trace_id);

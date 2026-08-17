CREATE TABLE IF NOT EXISTS logs (
    id                   TEXT PRIMARY KEY,
    time_ns              INTEGER NOT NULL,
    observed_time_ns     INTEGER,
    severity_number      INTEGER,
    severity_text        TEXT,
    body_any             TEXT,
    event_name           TEXT,
    service_name         TEXT,
    resource_attributes  TEXT,
    resource_dropped_attributes_count INTEGER NOT NULL,
    resource_schema_url  TEXT,
    scope_name           TEXT,
    scope_version        TEXT,
    scope_attributes     TEXT,
    scope_dropped_attributes_count INTEGER NOT NULL,
    scope_schema_url     TEXT,
    attributes           TEXT,
    dropped_attributes_count INTEGER NOT NULL,
    flags                INTEGER NOT NULL,
    trace_id             TEXT,
    span_id              TEXT,
    received_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_time ON logs (time_ns DESC);
CREATE INDEX IF NOT EXISTS idx_logs_trace ON logs (trace_id);

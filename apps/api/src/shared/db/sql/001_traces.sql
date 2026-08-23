CREATE TABLE IF NOT EXISTS traces (
    trace_id          TEXT PRIMARY KEY,
    root_span_id      TEXT,
    root_observed     INTEGER NOT NULL,
    root_service      TEXT,
    root_name         TEXT,
    start_time_ns     INTEGER NOT NULL,
    end_time_ns       INTEGER NOT NULL,
    duration_ns       INTEGER NOT NULL,
    status_code       TEXT NOT NULL,
    span_count        INTEGER NOT NULL,
    http_method       TEXT,
    http_status_code  INTEGER,
    http_url          TEXT,
    http_route        TEXT,
    service_breakdown TEXT,
    updated_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_traces_start ON traces (start_time_ns DESC);
CREATE INDEX IF NOT EXISTS idx_traces_root_service ON traces (root_service);
CREATE INDEX IF NOT EXISTS idx_traces_status_code ON traces (status_code);
CREATE INDEX IF NOT EXISTS idx_traces_http_method ON traces (http_method);
CREATE INDEX IF NOT EXISTS idx_traces_http_status_code ON traces (http_status_code);
CREATE INDEX IF NOT EXISTS idx_traces_http_route ON traces (http_route);

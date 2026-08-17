CREATE TABLE IF NOT EXISTS traces (
    trace_id      VARCHAR PRIMARY KEY,
    root_span_id  VARCHAR,
    root_observed BOOLEAN NOT NULL,
    root_service  VARCHAR,
    root_name     VARCHAR,
    start_time_ns UBIGINT NOT NULL,
    end_time_ns   UBIGINT NOT NULL,
    duration_ns   UBIGINT NOT NULL,
    status_code   VARCHAR NOT NULL,
    span_count    INTEGER NOT NULL,
    updated_at    TIMESTAMP NOT NULL DEFAULT current_timestamp
);

CREATE INDEX IF NOT EXISTS idx_traces_start ON traces (start_time_ns DESC);

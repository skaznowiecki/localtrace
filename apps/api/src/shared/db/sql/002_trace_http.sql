ALTER TABLE traces ADD COLUMN http_method TEXT;
ALTER TABLE traces ADD COLUMN http_status_code INTEGER;

CREATE INDEX IF NOT EXISTS idx_traces_root_service ON traces (root_service);
CREATE INDEX IF NOT EXISTS idx_traces_status_code ON traces (status_code);
CREATE INDEX IF NOT EXISTS idx_traces_http_method ON traces (http_method);
CREATE INDEX IF NOT EXISTS idx_traces_http_status_code ON traces (http_status_code);

ALTER TABLE traces ADD COLUMN IF NOT EXISTS http_route VARCHAR;
CREATE INDEX IF NOT EXISTS idx_traces_http_route ON traces (http_route);

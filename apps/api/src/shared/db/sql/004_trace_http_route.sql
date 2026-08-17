ALTER TABLE traces ADD COLUMN http_route TEXT;
CREATE INDEX IF NOT EXISTS idx_traces_http_route ON traces (http_route);

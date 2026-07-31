use super::span::{map_row as map_span_row, SpanRepository};
use crate::storage::DatabaseConnection;
use common::{read_attr, AppError, AppResult};
use domain::{is_root_parent, normalize_route_path, SpanRecord, TraceStatus, TraceSummary};
use duckdb::params_from_iter;
use std::sync::Arc;

const HTTP_METHODS: &[&str] = &[
    "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "TRACE", "CONNECT",
];

const TRACE_SELECT: &str = "SELECT trace_id, root_span_id, root_observed, root_service, root_name,
        start_time_ns, end_time_ns, duration_ns, status_code, span_count,
        http_method, http_status_code, http_url, http_route
 FROM traces";

#[derive(Debug, Clone, Default)]
pub struct TraceListFilters {
    pub limit: u32,
    pub service: Option<String>,
    pub status: Option<String>,
    pub method: Option<String>,
    pub http_status_code: Option<i32>,
    pub name: Option<String>,
    pub url: Option<String>,
    pub duration_min_ns: Option<u64>,
    pub duration_max_ns: Option<u64>,
    /// Inclusive lower bound on `start_time_ns` (wall-clock lookback).
    pub since_ns: Option<u64>,
}

#[derive(Debug, Clone, Default)]
pub struct TraceFacets {
    pub services: Vec<String>,
    pub statuses: Vec<String>,
    pub methods: Vec<String>,
    pub http_status_codes: Vec<i32>,
    pub routes: Vec<RouteFacet>,
}

/// A normalized route pattern and how many traces currently match it.
#[derive(Debug, Clone, Default)]
pub struct RouteFacet {
    pub value: String,
    pub count: u64,
}

pub struct TraceRepository {
    conn: Arc<DatabaseConnection>,
}

impl TraceRepository {
    pub fn new(conn: Arc<DatabaseConnection>) -> Self {
        Self { conn }
    }

    pub fn list(&self, filters: TraceListFilters) -> AppResult<Vec<TraceSummary>> {
        let conn = self.conn.clone();
        conn.with_conn(move |db| {
            let mut conditions = Vec::new();
            let mut params: Vec<String> = Vec::new();

            if let Some(service) = filters.service.as_ref().filter(|s| !s.is_empty()) {
                conditions.push("root_service = ?".to_string());
                params.push(service.clone());
            }
            if let Some(status) = filters.status.as_ref().filter(|s| !s.is_empty()) {
                conditions.push("status_code = ?".to_string());
                params.push(status.clone());
            }
            if let Some(method) = filters.method.as_ref().filter(|s| !s.is_empty()) {
                conditions.push("upper(http_method) = upper(?)".to_string());
                params.push(method.clone());
            }
            if let Some(code) = filters.http_status_code {
                conditions.push("http_status_code = ?".to_string());
                params.push(code.to_string());
            }
            if let Some(name) = filters.name.as_ref().filter(|s| !s.is_empty()) {
                conditions.push("root_name ILIKE '%' || ? || '%'".to_string());
                params.push(name.clone());
            }
            if let Some(url) = filters.url.as_ref().filter(|s| !s.is_empty()) {
                conditions.push("http_route = ?".to_string());
                params.push(url.clone());
            }
            if let Some(min_ns) = filters.duration_min_ns {
                conditions.push("duration_ns >= ?".to_string());
                params.push(min_ns.to_string());
            }
            if let Some(max_ns) = filters.duration_max_ns {
                conditions.push("duration_ns <= ?".to_string());
                params.push(max_ns.to_string());
            }
            if let Some(since_ns) = filters.since_ns {
                conditions.push("start_time_ns >= ?".to_string());
                params.push(since_ns.to_string());
            }

            let where_clause = if conditions.is_empty() {
                String::new()
            } else {
                format!(" WHERE {}", conditions.join(" AND "))
            };

            let sql = format!(
                "{TRACE_SELECT}{where_clause} ORDER BY start_time_ns DESC LIMIT ?"
            );
            params.push(filters.limit.to_string());

            let mut stmt = db
                .prepare(&sql)
                .map_err(|e| AppError::Database(e.to_string()))?;

            let rows = stmt
                .query_map(params_from_iter(params.iter().map(|p| p.as_str())), map_row)
                .map_err(|e| AppError::Database(e.to_string()))?;

            let mut traces = Vec::new();
            for row in rows {
                traces.push(row.map_err(|e| AppError::Database(e.to_string()))?);
            }
            Ok(traces)
        })
    }

    pub fn facets(&self) -> AppResult<TraceFacets> {
        let conn = self.conn.clone();
        conn.with_conn(move |db| {
            let services = distinct_strings(
                db,
                "SELECT DISTINCT COALESCE(root_service, 'unknown_service') AS value
                 FROM traces
                 ORDER BY value",
            )?;
            let methods = distinct_strings(
                db,
                "SELECT DISTINCT http_method AS value
                 FROM traces
                 WHERE http_method IS NOT NULL AND http_method <> ''
                 ORDER BY value",
            )?;
            let http_status_codes = distinct_ints(
                db,
                "SELECT DISTINCT http_status_code AS value
                 FROM traces
                 WHERE http_status_code IS NOT NULL
                 ORDER BY value",
            )?;
            let routes = route_facets(
                db,
                "SELECT http_route AS value, count(*) AS n
                 FROM traces
                 WHERE http_route IS NOT NULL AND http_route <> ''
                 GROUP BY http_route
                 ORDER BY n DESC, value",
            )?;

            Ok(TraceFacets {
                services,
                statuses: vec!["ok".into(), "error".into()],
                methods,
                http_status_codes,
                routes,
            })
        })
    }

    pub fn get_with_spans(
        &self,
        trace_id: &str,
    ) -> AppResult<Option<(TraceSummary, Vec<SpanRecord>)>> {
        let trace_id = trace_id.to_string();
        let conn = self.conn.clone();

        conn.with_conn(move |db| {
            let sql = format!("{TRACE_SELECT} WHERE trace_id = ?");
            let trace_result = db.query_row(&sql, [trace_id.clone()], map_row);

            let summary = match trace_result {
                Ok(trace) => trace,
                Err(duckdb::Error::QueryReturnedNoRows) => return Ok(None),
                Err(err) => return Err(AppError::Database(err.to_string())),
            };

            let spans = SpanRepository::list_for_trace(db, &trace_id)?;
            Ok(Some((summary, spans)))
        })
    }

    pub fn rebuild_summary(tx: &duckdb::Connection, trace_id: &str) -> AppResult<()> {
        let mut stmt = tx
            .prepare(
                "SELECT trace_id, span_id, parent_span_id, name, kind,
                        start_time_ns, end_time_ns, duration_ns, status_code, status_message,
                        trace_state, flags, dropped_attributes_count, dropped_events_count,
                        dropped_links_count, service_name, resource_attributes,
                        resource_dropped_attributes_count, resource_schema_url,
                        scope_name, scope_version, scope_attributes, scope_dropped_attributes_count,
                        scope_schema_url, attributes, events, links
                 FROM spans WHERE trace_id = ? ORDER BY start_time_ns ASC",
            )
            .map_err(|e| AppError::Database(e.to_string()))?;

        let rows = stmt
            .query_map([trace_id], map_span_row)
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut spans = Vec::new();
        for row in rows {
            spans.push(row.map_err(|e| AppError::Database(e.to_string()))?);
        }

        if spans.is_empty() {
            return Ok(());
        }

        let start_time_ns = spans.iter().map(|s| s.start_time_ns).min().unwrap_or(0);
        let end_time_ns = spans.iter().map(|s| s.end_time_ns).max().unwrap_or(0);
        let duration_ns = end_time_ns.saturating_sub(start_time_ns);
        let span_count = spans.len() as u32;

        let root = spans
            .iter()
            .find(|s| is_root_parent(s.parent_span_id.as_deref()))
            .or_else(|| spans.first());

        let root_observed = spans
            .iter()
            .any(|s| is_root_parent(s.parent_span_id.as_deref()));

        let (
            root_span_id,
            root_service,
            root_name,
            http_method,
            http_status_code,
            http_url,
            http_route,
        ) = match root {
            Some(r) => {
                let (method, code) = extract_http_fields(r);
                let url = extract_http_url(r);
                let route = url.as_deref().map(normalize_route_path);
                (
                    Some(r.span_id.clone()),
                    Some(r.service_name.clone()),
                    Some(r.name.clone()),
                    method,
                    code,
                    url,
                    route,
                )
            }
            None => (None, None, None, None, None, None, None),
        };

        // Trace-level status follows the root outcome (OTel status / HTTP code).
        // Child span errors stay on those spans in the waterfall — they do not
        // flip the whole trace to error when the request itself succeeded.
        let status = resolve_trace_status(root, http_status_code);

        tx.execute(
            "INSERT INTO traces (
                trace_id, root_span_id, root_observed, root_service, root_name,
                start_time_ns, end_time_ns, duration_ns, status_code, span_count,
                http_method, http_status_code, http_url, http_route, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, current_timestamp)
            ON CONFLICT (trace_id) DO UPDATE SET
                root_span_id = excluded.root_span_id,
                root_observed = excluded.root_observed,
                root_service = excluded.root_service,
                root_name = excluded.root_name,
                start_time_ns = excluded.start_time_ns,
                end_time_ns = excluded.end_time_ns,
                duration_ns = excluded.duration_ns,
                status_code = excluded.status_code,
                span_count = excluded.span_count,
                http_method = excluded.http_method,
                http_status_code = excluded.http_status_code,
                http_url = excluded.http_url,
                http_route = excluded.http_route,
                updated_at = now()",
            duckdb::params![
                trace_id,
                root_span_id.as_deref(),
                root_observed,
                root_service.as_deref(),
                root_name.as_deref(),
                start_time_ns,
                end_time_ns,
                duration_ns,
                status.as_str(),
                span_count,
                http_method.as_deref(),
                http_status_code,
                http_url.as_deref(),
                http_route.as_deref(),
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(())
    }
}

/// OTel STATUS_CODE_ERROR.
const OTEL_STATUS_ERROR: i32 = 2;
/// OTel STATUS_CODE_OK.
const OTEL_STATUS_OK: i32 = 1;

fn resolve_trace_status(
    root: Option<&SpanRecord>,
    http_status_code: Option<i32>,
) -> TraceStatus {
    if let Some(root) = root {
        if root.status_code == OTEL_STATUS_ERROR {
            return TraceStatus::Error;
        }
    }

    if let Some(code) = http_status_code {
        return if code >= 400 {
            TraceStatus::Error
        } else {
            TraceStatus::Ok
        };
    }

    if let Some(root) = root {
        if root.status_code == OTEL_STATUS_OK {
            return TraceStatus::Ok;
        }
    }

    TraceStatus::Ok
}

fn extract_http_fields(span: &SpanRecord) -> (Option<String>, Option<i32>) {
    let method = read_attr(
        &span.attributes,
        &["http.request.method", "http.method"],
    )
    .or_else(|| method_from_span_name(&span.name))
    .map(|m| m.to_uppercase());

    let status_code = read_attr(
        &span.attributes,
        &["http.response.status_code", "http.status_code"],
    )
    .and_then(|raw| raw.parse::<i32>().ok());

    (method, status_code)
}

/// Request **path** for the root span, denormalized so every HTTP trace renders
/// a consistent path in the list (method-only CORS `OPTIONS` included). Prefers
/// the route template (`/users/:id`) so rows group by endpoint and keep their
/// `:param` segments, then the concrete request path, then the path portion of
/// an absolute URL.
fn extract_http_url(span: &SpanRecord) -> Option<String> {
    if let Some(route) = read_attr(&span.attributes, &["http.route"])
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
    {
        return Some(route);
    }

    if let Some(path) = read_attr(&span.attributes, &["http.target", "url.path"])
        .map(|s| strip_query(s.trim()))
        .filter(|s| !s.is_empty())
    {
        return Some(path);
    }

    read_attr(&span.attributes, &["url.full", "http.url"])
        .and_then(|raw| path_from_url(raw.trim()))
        .filter(|s| !s.is_empty())
}

/// Drop a `?query` suffix from a path or target.
fn strip_query(value: &str) -> String {
    match value.find('?') {
        Some(idx) => value[..idx].to_string(),
        None => value.to_string(),
    }
}

/// Extract the path portion of an absolute (or scheme-less) URL.
fn path_from_url(raw: &str) -> Option<String> {
    let after_scheme = raw.splitn(2, "://").nth(1).unwrap_or(raw);
    let start = after_scheme.find('/')?;
    Some(strip_query(&after_scheme[start..]))
}

fn method_from_span_name(name: &str) -> Option<String> {
    let first = name.split_whitespace().next()?;
    let upper = first.to_uppercase();
    HTTP_METHODS
        .iter()
        .any(|m| *m == upper.as_str())
        .then_some(upper)
}

fn distinct_strings(db: &duckdb::Connection, sql: &str) -> AppResult<Vec<String>> {
    let mut stmt = db
        .prepare(sql)
        .map_err(|e| AppError::Database(e.to_string()))?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| AppError::Database(e.to_string()))?;

    let mut values = Vec::new();
    for row in rows {
        values.push(row.map_err(|e| AppError::Database(e.to_string()))?);
    }
    Ok(values)
}

fn route_facets(db: &duckdb::Connection, sql: &str) -> AppResult<Vec<RouteFacet>> {
    let mut stmt = db
        .prepare(sql)
        .map_err(|e| AppError::Database(e.to_string()))?;
    let rows = stmt
        .query_map([], |row| {
            Ok(RouteFacet {
                value: row.get::<_, String>(0)?,
                count: row.get::<_, i64>(1)?.max(0) as u64,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?;

    let mut values = Vec::new();
    for row in rows {
        values.push(row.map_err(|e| AppError::Database(e.to_string()))?);
    }
    Ok(values)
}

fn distinct_ints(db: &duckdb::Connection, sql: &str) -> AppResult<Vec<i32>> {
    let mut stmt = db
        .prepare(sql)
        .map_err(|e| AppError::Database(e.to_string()))?;
    let rows = stmt
        .query_map([], |row| row.get::<_, i32>(0))
        .map_err(|e| AppError::Database(e.to_string()))?;

    let mut values = Vec::new();
    for row in rows {
        values.push(row.map_err(|e| AppError::Database(e.to_string()))?);
    }
    Ok(values)
}

pub fn map_row(row: &duckdb::Row) -> duckdb::Result<TraceSummary> {
    let trace_id: String = row.get(0)?;
    let root_span_id: String = row.get(1)?;
    let root_observed: bool = row.get(2)?;
    let root_service: String = row.get(3)?;
    let root_name: String = row.get(4)?;
    let start_time_ns: u64 = row.get(5)?;
    let end_time_ns: u64 = row.get(6)?;
    let duration_ns: u64 = row.get(7)?;
    let status_code: String = row.get(8)?;
    let span_count: i32 = row.get(9)?;
    let http_method: Option<String> = row.get::<_, Option<String>>(10)?.and_then(|v| {
        if v.is_empty() {
            None
        } else {
            Some(v)
        }
    });
    let http_status_code: Option<i32> = row.get(11)?;
    let http_url: Option<String> = row.get::<_, Option<String>>(12)?.and_then(|v| {
        if v.is_empty() {
            None
        } else {
            Some(v)
        }
    });
    let http_route: Option<String> = row.get::<_, Option<String>>(13)?.and_then(|v| {
        if v.is_empty() {
            None
        } else {
            Some(v)
        }
    });

    let status = match status_code.as_str() {
        "error" => TraceStatus::Error,
        _ => TraceStatus::Ok,
    };

    Ok(TraceSummary {
        trace_id,
        root_span_id: if root_span_id.is_empty() {
            None
        } else {
            Some(root_span_id)
        },
        root_observed,
        root_service: if root_service.is_empty() {
            None
        } else {
            Some(root_service)
        },
        root_name: if root_name.is_empty() {
            None
        } else {
            Some(root_name)
        },
        start_time_ns,
        end_time_ns,
        duration_ns,
        status,
        span_count: span_count as u32,
        http_method,
        http_status_code,
        http_url,
        http_route,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{json, Value};

    #[test]
    fn extracts_http_from_nested_attributes() {
        let span = SpanRecord {
            trace_id: "t".into(),
            span_id: "s".into(),
            parent_span_id: None,
            name: "request".into(),
            kind: 1,
            start_time_ns: 0,
            end_time_ns: 1,
            duration_ns: 1,
            status_code: 1,
            status_message: None,
            trace_state: None,
            flags: 0,
            dropped_attributes_count: 0,
            dropped_events_count: 0,
            dropped_links_count: 0,
            service_name: "api".into(),
            resource_attributes: Value::Null,
            resource_dropped_attributes_count: 0,
            resource_schema_url: None,
            scope_name: None,
            scope_version: None,
            scope_attributes: Value::Null,
            scope_dropped_attributes_count: 0,
            scope_schema_url: None,
            attributes: json!({
                "http": {
                    "request": { "method": "post" },
                    "response": { "status_code": 201 }
                }
            }),
            events: Value::Null,
            links: Value::Null,
        };

        let (method, code) = extract_http_fields(&span);
        assert_eq!(method.as_deref(), Some("POST"));
        assert_eq!(code, Some(201));
    }

    #[test]
    fn falls_back_to_span_name_method() {
        let span = SpanRecord {
            trace_id: "t".into(),
            span_id: "s".into(),
            parent_span_id: None,
            name: "GET /health".into(),
            kind: 1,
            start_time_ns: 0,
            end_time_ns: 1,
            duration_ns: 1,
            status_code: 1,
            status_message: None,
            trace_state: None,
            flags: 0,
            dropped_attributes_count: 0,
            dropped_events_count: 0,
            dropped_links_count: 0,
            service_name: "api".into(),
            resource_attributes: Value::Null,
            resource_dropped_attributes_count: 0,
            resource_schema_url: None,
            scope_name: None,
            scope_version: None,
            scope_attributes: Value::Null,
            scope_dropped_attributes_count: 0,
            scope_schema_url: None,
            attributes: json!({}),
            events: Value::Null,
            links: Value::Null,
        };

        let (method, code) = extract_http_fields(&span);
        assert_eq!(method.as_deref(), Some("GET"));
        assert_eq!(code, None);
    }

    fn sample_root(status_code: i32) -> SpanRecord {
        SpanRecord {
            trace_id: "t".into(),
            span_id: "s".into(),
            parent_span_id: None,
            name: "POST /x".into(),
            kind: 2,
            start_time_ns: 0,
            end_time_ns: 1,
            duration_ns: 1,
            status_code,
            status_message: None,
            trace_state: None,
            flags: 0,
            dropped_attributes_count: 0,
            dropped_events_count: 0,
            dropped_links_count: 0,
            service_name: "api".into(),
            resource_attributes: Value::Null,
            resource_dropped_attributes_count: 0,
            resource_schema_url: None,
            scope_name: None,
            scope_version: None,
            scope_attributes: Value::Null,
            scope_dropped_attributes_count: 0,
            scope_schema_url: None,
            attributes: json!({}),
            events: Value::Null,
            links: Value::Null,
        }
    }

    #[test]
    fn trace_status_follows_http_success_not_child_errors() {
        // Root unset + HTTP 201 → ok (child errors must not escalate).
        assert_eq!(
            resolve_trace_status(Some(&sample_root(0)), Some(201)),
            TraceStatus::Ok
        );
    }

    #[test]
    fn trace_status_http_client_error() {
        assert_eq!(
            resolve_trace_status(Some(&sample_root(0)), Some(404)),
            TraceStatus::Error
        );
    }

    #[test]
    fn trace_status_root_otel_error_wins() {
        assert_eq!(
            resolve_trace_status(Some(&sample_root(2)), Some(200)),
            TraceStatus::Error
        );
    }
}

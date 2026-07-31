use crate::storage::DatabaseConnection;
use common::{json_str, opt_json_str, parse_json, AppError, AppResult};
use domain::LogRecord;
use serde_json::Value;
use std::sync::Arc;

#[derive(Clone)]
pub struct LogRepository {
    conn: Arc<DatabaseConnection>,
}

impl LogRepository {
    pub fn new(conn: Arc<DatabaseConnection>) -> Self {
        Self { conn }
    }

    pub fn insert(&self, logs: &[LogRecord]) -> AppResult<()> {
        if logs.is_empty() {
            return Ok(());
        }

        let logs = logs.to_vec();
        let conn = self.conn.clone();

        conn.with_conn(move |db| {
            let tx = db
                .unchecked_transaction()
                .map_err(|e| AppError::Database(e.to_string()))?;

            for log in logs {
                tx.execute(
                    "INSERT INTO logs (
                        id, time_ns, observed_time_ns, severity_number, severity_text,
                        body_any, event_name, service_name, resource_attributes,
                        resource_dropped_attributes_count, resource_schema_url,
                        scope_name, scope_version, scope_attributes, scope_dropped_attributes_count,
                        scope_schema_url, attributes, dropped_attributes_count, flags,
                        trace_id, span_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [
                        log.id,
                        log.time_ns.to_string(),
                        log.observed_time_ns.map(|v| v.to_string()).unwrap_or_default(),
                        log.severity_number.map(|v| v.to_string()).unwrap_or_default(),
                        log.severity_text.unwrap_or_default(),
                        opt_json_str(&log.body_any).unwrap_or_default(),
                        log.event_name.unwrap_or_default(),
                        log.service_name,
                        json_str(&log.resource_attributes),
                        log.resource_dropped_attributes_count.to_string(),
                        log.resource_schema_url.unwrap_or_default(),
                        log.scope_name.unwrap_or_default(),
                        log.scope_version.unwrap_or_default(),
                        json_str(&log.scope_attributes),
                        log.scope_dropped_attributes_count.to_string(),
                        log.scope_schema_url.unwrap_or_default(),
                        json_str(&log.attributes),
                        log.dropped_attributes_count.to_string(),
                        log.flags.to_string(),
                        log.trace_id.unwrap_or_default(),
                        log.span_id.unwrap_or_default(),
                    ],
                )
                .map_err(|e| AppError::Database(e.to_string()))?;
            }

            tx.commit()
                .map_err(|e| AppError::Database(e.to_string()))?;
            Ok(())
        })
    }

    pub fn list_for_trace(&self, trace_id: &str) -> AppResult<Vec<LogRecord>> {
        let trace_id = trace_id.to_string();
        let conn = self.conn.clone();

        conn.with_conn(move |db| {
            let mut stmt = db
                .prepare(
                    "SELECT id, time_ns, observed_time_ns, severity_number, severity_text,
                            body_any, event_name, service_name, resource_attributes,
                            resource_dropped_attributes_count, resource_schema_url,
                            scope_name, scope_version, scope_attributes,
                            scope_dropped_attributes_count, scope_schema_url,
                            attributes, dropped_attributes_count, flags,
                            trace_id, span_id
                     FROM logs
                     WHERE trace_id = ?
                     ORDER BY time_ns ASC",
                )
                .map_err(|e| AppError::Database(e.to_string()))?;

            let rows = stmt
                .query_map([trace_id], map_row)
                .map_err(|e| AppError::Database(e.to_string()))?;

            let mut logs = Vec::new();
            for row in rows {
                logs.push(row.map_err(|e| AppError::Database(e.to_string()))?);
            }
            Ok(logs)
        })
    }
}

fn empty_to_none(value: String) -> Option<String> {
    if value.is_empty() {
        None
    } else {
        Some(value)
    }
}

fn parse_opt_json(raw: &str) -> Option<Value> {
    if raw.is_empty() {
        return None;
    }
    let value = parse_json(raw);
    if value.is_null() {
        None
    } else {
        Some(value)
    }
}

fn map_row(row: &duckdb::Row) -> duckdb::Result<LogRecord> {
    let id: String = row.get(0)?;
    let time_ns: u64 = row.get(1)?;
    let observed_time_ns: Option<u64> = row.get(2)?;
    let severity_number: Option<i32> = row.get(3)?;
    let severity_text: String = row.get(4)?;
    let body_any: String = row.get(5)?;
    let event_name: String = row.get(6)?;
    let service_name: String = row.get(7)?;
    let resource_attributes: String = row.get(8)?;
    let resource_dropped_attributes_count: u64 = row.get(9)?;
    let resource_schema_url: String = row.get(10)?;
    let scope_name: String = row.get(11)?;
    let scope_version: String = row.get(12)?;
    let scope_attributes: String = row.get(13)?;
    let scope_dropped_attributes_count: u64 = row.get(14)?;
    let scope_schema_url: String = row.get(15)?;
    let attributes: String = row.get(16)?;
    let dropped_attributes_count: u64 = row.get(17)?;
    let flags: u64 = row.get(18)?;
    let trace_id: String = row.get(19)?;
    let span_id: String = row.get(20)?;

    Ok(LogRecord {
        id,
        time_ns,
        observed_time_ns,
        severity_number,
        severity_text: empty_to_none(severity_text),
        body_any: parse_opt_json(&body_any),
        event_name: empty_to_none(event_name),
        service_name,
        resource_attributes: parse_json(&resource_attributes),
        resource_dropped_attributes_count: resource_dropped_attributes_count as u32,
        resource_schema_url: empty_to_none(resource_schema_url),
        scope_name: empty_to_none(scope_name),
        scope_version: empty_to_none(scope_version),
        scope_attributes: parse_json(&scope_attributes),
        scope_dropped_attributes_count: scope_dropped_attributes_count as u32,
        scope_schema_url: empty_to_none(scope_schema_url),
        attributes: parse_json(&attributes),
        dropped_attributes_count: dropped_attributes_count as u32,
        flags: flags as u32,
        trace_id: empty_to_none(trace_id),
        span_id: empty_to_none(span_id),
    })
}

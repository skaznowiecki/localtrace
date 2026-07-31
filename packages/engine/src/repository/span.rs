use common::{json_str, parse_json};
use super::trace::TraceRepository;
use crate::storage::DatabaseConnection;
use common::{AppError, AppResult};
use domain::SpanRecord;
use std::collections::HashSet;
use std::sync::Arc;

#[derive(Clone)]
pub struct SpanRepository {
    conn: Arc<DatabaseConnection>,
}

impl SpanRepository {
    pub fn new(conn: Arc<DatabaseConnection>) -> Self {
        Self { conn }
    }

    pub fn insert(&self, spans: &[SpanRecord]) -> AppResult<()> {
        if spans.is_empty() {
            return Ok(());
        }

        let spans = spans.to_vec();
        let conn = self.conn.clone();

        conn.with_conn(move |db| {
            let tx = db
                .unchecked_transaction()
                .map_err(|e| AppError::Database(e.to_string()))?;

            let mut affected = HashSet::new();

            for span in &spans {
                upsert_one(&tx, span)?;
                affected.insert(span.trace_id.clone());
            }

            for trace_id in affected {
                TraceRepository::rebuild_summary(&tx, &trace_id)?;
            }

            tx.commit()
                .map_err(|e| AppError::Database(e.to_string()))?;
            Ok(())
        })
    }

    pub fn list_for_trace(db: &duckdb::Connection, trace_id: &str) -> AppResult<Vec<SpanRecord>> {
        let mut stmt = db
            .prepare(
                "SELECT trace_id, span_id, parent_span_id, name, kind,
                        start_time_ns, end_time_ns, duration_ns, status_code, status_message,
                        trace_state, flags, dropped_attributes_count, dropped_events_count,
                        dropped_links_count, service_name, resource_attributes,
                        resource_dropped_attributes_count, resource_schema_url,
                        scope_name, scope_version, scope_attributes, scope_dropped_attributes_count,
                        scope_schema_url, attributes, events, links
                 FROM spans
                 WHERE trace_id = ?
                 ORDER BY start_time_ns ASC",
            )
            .map_err(|e| AppError::Database(e.to_string()))?;

        let rows = stmt
            .query_map([trace_id], map_row)
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut spans = Vec::new();
        for row in rows {
            spans.push(row.map_err(|e| AppError::Database(e.to_string()))?);
        }
        Ok(spans)
    }
}

fn upsert_one(tx: &duckdb::Connection, span: &SpanRecord) -> AppResult<()> {
    tx.execute(
        "INSERT INTO spans (
            trace_id, span_id, parent_span_id, name, kind,
            start_time_ns, end_time_ns, duration_ns, status_code, status_message,
            trace_state, flags, dropped_attributes_count, dropped_events_count,
            dropped_links_count, service_name, resource_attributes,
            resource_dropped_attributes_count, resource_schema_url,
            scope_name, scope_version, scope_attributes, scope_dropped_attributes_count,
            scope_schema_url, attributes, events, links
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (trace_id, span_id) DO UPDATE SET
            parent_span_id = excluded.parent_span_id,
            name = excluded.name,
            kind = excluded.kind,
            start_time_ns = excluded.start_time_ns,
            end_time_ns = excluded.end_time_ns,
            duration_ns = excluded.duration_ns,
            status_code = excluded.status_code,
            status_message = excluded.status_message,
            trace_state = excluded.trace_state,
            flags = excluded.flags,
            dropped_attributes_count = excluded.dropped_attributes_count,
            dropped_events_count = excluded.dropped_events_count,
            dropped_links_count = excluded.dropped_links_count,
            service_name = excluded.service_name,
            resource_attributes = excluded.resource_attributes,
            resource_dropped_attributes_count = excluded.resource_dropped_attributes_count,
            resource_schema_url = excluded.resource_schema_url,
            scope_name = excluded.scope_name,
            scope_version = excluded.scope_version,
            scope_attributes = excluded.scope_attributes,
            scope_dropped_attributes_count = excluded.scope_dropped_attributes_count,
            scope_schema_url = excluded.scope_schema_url,
            attributes = excluded.attributes,
            events = excluded.events,
            links = excluded.links,
            received_at = now()",
        [
            span.trace_id.clone(),
            span.span_id.clone(),
            span.parent_span_id.clone().unwrap_or_default(),
            span.name.clone(),
            span.kind.to_string(),
            span.start_time_ns.to_string(),
            span.end_time_ns.to_string(),
            span.duration_ns.to_string(),
            span.status_code.to_string(),
            span.status_message.clone().unwrap_or_default(),
            span.trace_state.clone().unwrap_or_default(),
            span.flags.to_string(),
            span.dropped_attributes_count.to_string(),
            span.dropped_events_count.to_string(),
            span.dropped_links_count.to_string(),
            span.service_name.clone(),
            json_str(&span.resource_attributes),
            span.resource_dropped_attributes_count.to_string(),
            span.resource_schema_url.clone().unwrap_or_default(),
            span.scope_name.clone().unwrap_or_default(),
            span.scope_version.clone().unwrap_or_default(),
            json_str(&span.scope_attributes),
            span.scope_dropped_attributes_count.to_string(),
            span.scope_schema_url.clone().unwrap_or_default(),
            json_str(&span.attributes),
            json_str(&span.events),
            json_str(&span.links),
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;
    Ok(())
}

pub fn map_row(row: &duckdb::Row) -> duckdb::Result<SpanRecord> {
    let trace_id: String = row.get(0)?;
    let span_id: String = row.get(1)?;
    let parent_span_id: String = row.get(2)?;
    let name: String = row.get(3)?;
    let kind: i32 = row.get(4)?;
    let start_time_ns: u64 = row.get(5)?;
    let end_time_ns: u64 = row.get(6)?;
    let duration_ns: u64 = row.get(7)?;
    let status_code: i32 = row.get(8)?;
    let status_message: String = row.get(9)?;
    let trace_state: String = row.get(10)?;
    let flags: u64 = row.get(11)?;
    let dropped_attributes_count: u64 = row.get(12)?;
    let dropped_events_count: u64 = row.get(13)?;
    let dropped_links_count: u64 = row.get(14)?;
    let service_name: String = row.get(15)?;
    let resource_attributes: String = row.get(16)?;
    let resource_dropped_attributes_count: u64 = row.get(17)?;
    let resource_schema_url: String = row.get(18)?;
    let scope_name: String = row.get(19)?;
    let scope_version: String = row.get(20)?;
    let scope_attributes: String = row.get(21)?;
    let scope_dropped_attributes_count: u64 = row.get(22)?;
    let scope_schema_url: String = row.get(23)?;
    let attributes: String = row.get(24)?;
    let events: String = row.get(25)?;
    let links: String = row.get(26)?;

    Ok(SpanRecord {
        trace_id,
        span_id,
        parent_span_id: if parent_span_id.is_empty() {
            None
        } else {
            Some(parent_span_id)
        },
        name,
        kind,
        start_time_ns,
        end_time_ns,
        duration_ns,
        status_code,
        status_message: if status_message.is_empty() {
            None
        } else {
            Some(status_message)
        },
        trace_state: if trace_state.is_empty() {
            None
        } else {
            Some(trace_state)
        },
        flags: flags as u32,
        dropped_attributes_count: dropped_attributes_count as u32,
        dropped_events_count: dropped_events_count as u32,
        dropped_links_count: dropped_links_count as u32,
        service_name,
        resource_attributes: parse_json(&resource_attributes),
        resource_dropped_attributes_count: resource_dropped_attributes_count as u32,
        resource_schema_url: if resource_schema_url.is_empty() {
            None
        } else {
            Some(resource_schema_url)
        },
        scope_name: if scope_name.is_empty() {
            None
        } else {
            Some(scope_name)
        },
        scope_version: if scope_version.is_empty() {
            None
        } else {
            Some(scope_version)
        },
        scope_attributes: parse_json(&scope_attributes),
        scope_dropped_attributes_count: scope_dropped_attributes_count as u32,
        scope_schema_url: if scope_schema_url.is_empty() {
            None
        } else {
            Some(scope_schema_url)
        },
        attributes: parse_json(&attributes),
        events: parse_json(&events),
        links: parse_json(&links),
    })
}

mod log;
mod metric;
mod service;
mod span;
mod trace;

pub use log::LogRepository;
pub use metric::MetricRepository;
pub use service::ServiceRepository;
pub use span::SpanRepository;
pub use trace::{RouteFacet, TraceFacets, TraceListFilters, TraceRepository};

use crate::storage::{init_schema, DatabaseConnection};
use common::{AppError, AppResult};
use std::path::Path;
use std::sync::Arc;

pub struct Repositories {
    pub spans: SpanRepository,
    pub traces: TraceRepository,
    pub logs: LogRepository,
    pub metrics: MetricRepository,
    pub services: ServiceRepository,
}

impl Repositories {
    pub fn open(database_path: &str) -> AppResult<Self> {
        let path = Path::new(database_path);
        ensure_parent_dir(path)?;
        let conn = Arc::new(DatabaseConnection::open(path)?);
        conn.with_conn(init_schema)?;
        conn.with_conn(repair_trace_status_from_root)?;

        // Fold schema DDL into the main database file and truncate the WAL.
        // DuckDB cannot always replay DDL entries (e.g. ALTER on a table with a
        // function-based DEFAULT) from the WAL, so we must not let migrations
        // linger there across restarts (cargo-watch kills the process without a
        // clean shutdown, which would otherwise leave the DDL unreplayable).
        conn.with_conn(|c| {
            c.execute_batch("CHECKPOINT")
                .map_err(|e| AppError::Database(format!("checkpoint after migrations: {e}")))
        })?;

        Ok(Self {
            spans: SpanRepository::new(conn.clone()),
            traces: TraceRepository::new(conn.clone()),
            logs: LogRepository::new(conn.clone()),
            metrics: MetricRepository::new(conn.clone()),
            services: ServiceRepository::new(conn),
        })
    }
}

fn ensure_parent_dir(path: &Path) -> AppResult<()> {
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)
                .map_err(|e| AppError::Database(format!("failed to create data dir: {e}")))?;
        }
    }
    Ok(())
}

/// One-shot correction for summaries that marked the whole trace as error when
/// only a child span failed. Successful HTTP roots (and non-error OTel roots)
/// are rewritten to `ok`; safe to run on every open (idempotent).
fn repair_trace_status_from_root(conn: &duckdb::Connection) -> AppResult<()> {
    conn.execute_batch(
        r#"
        UPDATE traces t
        SET status_code = 'ok'
        WHERE t.status_code = 'error'
          AND t.http_status_code IS NOT NULL
          AND t.http_status_code < 400
          AND EXISTS (
            SELECT 1
            FROM spans s
            WHERE s.trace_id = t.trace_id
              AND s.span_id = t.root_span_id
              AND s.status_code != 2
          );
        "#,
    )
    .map_err(|e| AppError::Database(format!("repair trace status: {e}")))?;
    Ok(())
}

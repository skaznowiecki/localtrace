use crate::storage::DatabaseConnection;
use common::{AppError, AppResult};
use domain::ServiceSummary;
use std::sync::Arc;

pub struct ServiceRepository {
    conn: Arc<DatabaseConnection>,
}

impl ServiceRepository {
    pub fn new(conn: Arc<DatabaseConnection>) -> Self {
        Self { conn }
    }

    pub fn list(&self) -> AppResult<Vec<ServiceSummary>> {
        let conn = self.conn.clone();
        conn.with_conn(move |db| {
            let mut stmt = db
                .prepare(
                    "SELECT COALESCE(root_service, 'unknown_service') as service, COUNT(*) as trace_count
                     FROM traces
                     GROUP BY COALESCE(root_service, 'unknown_service')
                     ORDER BY trace_count DESC",
                )
                .map_err(|e| AppError::Database(e.to_string()))?;

            let rows = stmt
                .query_map([], |row| {
                    let name: String = row.get(0)?;
                    let trace_count: i64 = row.get(1)?;
                    Ok(ServiceSummary {
                        name,
                        trace_count: trace_count as u64,
                    })
                })
                .map_err(|e| AppError::Database(e.to_string()))?;

            let mut services = Vec::new();
            for row in rows {
                services.push(row.map_err(|e| AppError::Database(e.to_string()))?);
            }
            Ok(services)
        })
    }
}

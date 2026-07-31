use common::json_str;
use crate::storage::DatabaseConnection;
use common::{AppError, AppResult};
use domain::MetricDataPoint;
use std::sync::Arc;

#[derive(Clone)]
pub struct MetricRepository {
    conn: Arc<DatabaseConnection>,
}

impl MetricRepository {
    pub fn new(conn: Arc<DatabaseConnection>) -> Self {
        Self { conn }
    }

    pub fn insert(&self, points: &[MetricDataPoint]) -> AppResult<()> {
        if points.is_empty() {
            return Ok(());
        }

        let points = points.to_vec();
        let conn = self.conn.clone();

        conn.with_conn(move |db| {
            let tx = db
                .unchecked_transaction()
                .map_err(|e| AppError::Database(e.to_string()))?;

            for point in points {
                tx.execute(
                    "INSERT INTO metrics (
                        id, name, description, unit, metric_type, aggregation_temporality,
                        is_monotonic, metadata, service_name, resource_attributes,
                        resource_dropped_attributes_count, resource_schema_url,
                        scope_name, scope_version, scope_attributes, scope_dropped_attributes_count,
                        scope_schema_url, attributes, start_time_ns, time_ns,
                        value_double, int_value, count, sum, min, max, exemplars, flags, data
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [
                        point.id,
                        point.name,
                        point.description.unwrap_or_default(),
                        point.unit.unwrap_or_default(),
                        point.metric_type.to_string(),
                        point
                            .aggregation_temporality
                            .map(|v| v.to_string())
                            .unwrap_or_default(),
                        point
                            .is_monotonic
                            .map(|v| if v { "true".to_string() } else { "false".to_string() })
                            .unwrap_or_default(),
                        json_str(&point.metadata),
                        point.service_name,
                        json_str(&point.resource_attributes),
                        point.resource_dropped_attributes_count.to_string(),
                        point.resource_schema_url.unwrap_or_default(),
                        point.scope_name.unwrap_or_default(),
                        point.scope_version.unwrap_or_default(),
                        json_str(&point.scope_attributes),
                        point.scope_dropped_attributes_count.to_string(),
                        point.scope_schema_url.unwrap_or_default(),
                        json_str(&point.attributes),
                        point.start_time_ns.map(|v| v.to_string()).unwrap_or_default(),
                        point.time_ns.to_string(),
                        point
                            .value_double
                            .map(|v| v.to_string())
                            .unwrap_or_default(),
                        point.int_value.map(|v| v.to_string()).unwrap_or_default(),
                        point.count.map(|v| v.to_string()).unwrap_or_default(),
                        point.sum.map(|v| v.to_string()).unwrap_or_default(),
                        point.min.map(|v| v.to_string()).unwrap_or_default(),
                        point.max.map(|v| v.to_string()).unwrap_or_default(),
                        json_str(&point.exemplars),
                        point.flags.to_string(),
                        json_str(&point.data),
                    ],
                )
                .map_err(|e| AppError::Database(e.to_string()))?;
            }

            tx.commit()
                .map_err(|e| AppError::Database(e.to_string()))?;
            Ok(())
        })
    }
}

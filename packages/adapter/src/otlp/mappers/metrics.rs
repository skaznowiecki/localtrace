use crate::otlp::error::OtlpError;
use crate::otlp::values::{key_values_to_json, service_name_from_resource};
use domain::MetricDataPoint;
use opentelemetry_proto::tonic::collector::metrics::v1::ExportMetricsServiceRequest;
use opentelemetry_proto::tonic::metrics::v1::{
    metric, Exemplar, ExponentialHistogram, ExponentialHistogramDataPoint, Gauge, Histogram,
    HistogramDataPoint, Metric, NumberDataPoint, Summary, SummaryDataPoint,
};
use prost::Message;
use serde_json::{json, Value};
use uuid::Uuid;

pub fn map_metrics(request: ExportMetricsServiceRequest) -> Result<Vec<MetricDataPoint>, OtlpError> {
    let mut out = Vec::new();

    for resource_metrics in request.resource_metrics {
        let resource = resource_metrics.resource.as_ref();
        let resource_attributes = resource
            .map(|r| key_values_to_json(&r.attributes))
            .unwrap_or_else(|| json!([]));
        let resource_dropped = resource.map(|r| r.dropped_attributes_count).unwrap_or(0);
        let resource_schema_url = None;
        let service_name = resource
            .map(|r| service_name_from_resource(&r.attributes))
            .unwrap_or_else(|| "unknown_service".into());

        for scope_metrics in resource_metrics.scope_metrics {
            let scope = scope_metrics.scope.as_ref();
            let scope_name = scope.map(|s| s.name.clone()).filter(|s| !s.is_empty());
            let scope_version = scope
                .map(|s| s.version.clone())
                .filter(|s| !s.is_empty());
            let scope_attributes = scope
                .map(|s| key_values_to_json(&s.attributes))
                .unwrap_or_else(|| json!([]));
            let scope_dropped = scope.map(|s| s.dropped_attributes_count).unwrap_or(0);
            let scope_schema_url = None;

            for metric in scope_metrics.metrics {
                out.extend(map_metric(
                    metric,
                    service_name.clone(),
                    resource_attributes.clone(),
                    resource_dropped,
                    resource_schema_url.clone(),
                    scope_name.clone(),
                    scope_version.clone(),
                    scope_attributes.clone(),
                    scope_dropped,
                    scope_schema_url.clone(),
                )?);
            }
        }
    }

    Ok(out)
}

fn map_metric(
    metric: Metric,
    service_name: String,
    resource_attributes: Value,
    resource_dropped_attributes_count: u32,
    resource_schema_url: Option<String>,
    scope_name: Option<String>,
    scope_version: Option<String>,
    scope_attributes: Value,
    scope_dropped_attributes_count: u32,
    scope_schema_url: Option<String>,
) -> Result<Vec<MetricDataPoint>, OtlpError> {
    let metadata = key_values_to_json(&metric.metadata);
    let base = MetricBase {
        name: metric.name,
        description: if metric.description.is_empty() {
            None
        } else {
            Some(metric.description)
        },
        unit: if metric.unit.is_empty() {
            None
        } else {
            Some(metric.unit)
        },
        metadata,
        service_name,
        resource_attributes,
        resource_dropped_attributes_count,
        resource_schema_url,
        scope_name,
        scope_version,
        scope_attributes,
        scope_dropped_attributes_count,
        scope_schema_url,
    };

    match metric.data {
        Some(metric::Data::Gauge(gauge)) => map_gauge(base, gauge),
        Some(metric::Data::Sum(sum)) => map_sum(base, sum),
        Some(metric::Data::Histogram(hist)) => map_histogram(base, hist),
        Some(metric::Data::ExponentialHistogram(hist)) => map_exponential_histogram(base, hist),
        Some(metric::Data::Summary(summary)) => map_summary(base, summary),
        None => Ok(Vec::new()),
    }
}

struct MetricBase {
    name: String,
    description: Option<String>,
    unit: Option<String>,
    metadata: Value,
    service_name: String,
    resource_attributes: Value,
    resource_dropped_attributes_count: u32,
    resource_schema_url: Option<String>,
    scope_name: Option<String>,
    scope_version: Option<String>,
    scope_attributes: Value,
    scope_dropped_attributes_count: u32,
    scope_schema_url: Option<String>,
}

fn map_gauge(base: MetricBase, gauge: Gauge) -> Result<Vec<MetricDataPoint>, OtlpError> {
    gauge
        .data_points
        .into_iter()
        .map(|point| {
            let (value_double, int_value) = number_values(&point);
            Ok(build_point(
                base.clone_fields(),
                1,
                None,
                None,
                key_values_to_json(&point.attributes),
                point.start_time_unix_nano,
                point.time_unix_nano,
                value_double,
                int_value,
                None,
                None,
                None,
                None,
                exemplars_json(&point.exemplars),
                point.flags,
                json!({ "gauge": number_point_json(&point) }),
            ))
        })
        .collect()
}

fn map_sum(
    base: MetricBase,
    sum: opentelemetry_proto::tonic::metrics::v1::Sum,
) -> Result<Vec<MetricDataPoint>, OtlpError> {
    let temporality = Some(sum.aggregation_temporality as i32);
    let is_monotonic = Some(sum.is_monotonic);
    sum.data_points
        .into_iter()
        .map(|point| {
            let (value_double, int_value) = number_values(&point);
            Ok(build_point(
                base.clone_fields(),
                2,
                temporality,
                is_monotonic,
                key_values_to_json(&point.attributes),
                point.start_time_unix_nano,
                point.time_unix_nano,
                value_double,
                int_value,
                None,
                None,
                None,
                None,
                exemplars_json(&point.exemplars),
                point.flags,
                json!({ "sum": number_point_json(&point) }),
            ))
        })
        .collect()
}

fn map_histogram(
    base: MetricBase,
    hist: Histogram,
) -> Result<Vec<MetricDataPoint>, OtlpError> {
    let temporality = Some(hist.aggregation_temporality as i32);
    hist.data_points
        .into_iter()
        .map(|point| {
            validate_histogram(&point)?;
            Ok(build_point(
                base.clone_fields(),
                3,
                temporality,
                None,
                key_values_to_json(&point.attributes),
                point.start_time_unix_nano,
                point.time_unix_nano,
                None,
                None,
                Some(point.count),
                point.sum,
                point.min,
                point.max,
                exemplars_json(&point.exemplars),
                point.flags,
                json!({ "histogram": histogram_point_json(&point) }),
            ))
        })
        .collect()
}

fn map_exponential_histogram(
    base: MetricBase,
    hist: ExponentialHistogram,
) -> Result<Vec<MetricDataPoint>, OtlpError> {
    let temporality = Some(hist.aggregation_temporality as i32);
    hist.data_points
        .into_iter()
        .map(|point| {
            validate_exponential_histogram(&point)?;
            Ok(build_point(
                base.clone_fields(),
                4,
                temporality,
                None,
                key_values_to_json(&point.attributes),
                point.start_time_unix_nano,
                point.time_unix_nano,
                None,
                None,
                Some(point.count),
                point.sum,
                point.min,
                point.max,
                exemplars_json(&point.exemplars),
                point.flags,
                json!({ "exponentialHistogram": exponential_histogram_point_json(&point) }),
            ))
        })
        .collect()
}

fn map_summary(
    base: MetricBase,
    summary: Summary,
) -> Result<Vec<MetricDataPoint>, OtlpError> {
    summary
        .data_points
        .into_iter()
        .map(|point| {
            validate_summary(&point)?;
            Ok(build_point(
                base.clone_fields(),
                5,
                None,
                None,
                key_values_to_json(&point.attributes),
                point.start_time_unix_nano,
                point.time_unix_nano,
                None,
                None,
                Some(point.count),
                Some(point.sum),
                None,
                None,
                json!([]),
                point.flags,
                json!({ "summary": summary_point_json(&point) }),
            ))
        })
        .collect()
}

impl MetricBase {
    fn clone_fields(&self) -> MetricBase {
        MetricBase {
            name: self.name.clone(),
            description: self.description.clone(),
            unit: self.unit.clone(),
            metadata: self.metadata.clone(),
            service_name: self.service_name.clone(),
            resource_attributes: self.resource_attributes.clone(),
            resource_dropped_attributes_count: self.resource_dropped_attributes_count,
            resource_schema_url: self.resource_schema_url.clone(),
            scope_name: self.scope_name.clone(),
            scope_version: self.scope_version.clone(),
            scope_attributes: self.scope_attributes.clone(),
            scope_dropped_attributes_count: self.scope_dropped_attributes_count,
            scope_schema_url: self.scope_schema_url.clone(),
        }
    }
}

fn build_point(
    base: MetricBase,
    metric_type: i32,
    aggregation_temporality: Option<i32>,
    is_monotonic: Option<bool>,
    attributes: Value,
    start_time_ns: u64,
    time_ns: u64,
    value_double: Option<f64>,
    int_value: Option<i64>,
    count: Option<u64>,
    sum: Option<f64>,
    min: Option<f64>,
    max: Option<f64>,
    exemplars: Value,
    flags: u32,
    data: Value,
) -> MetricDataPoint {
    MetricDataPoint {
        id: Uuid::new_v4().to_string(),
        name: base.name,
        description: base.description,
        unit: base.unit,
        metric_type,
        aggregation_temporality,
        is_monotonic,
        metadata: base.metadata,
        service_name: base.service_name,
        resource_attributes: base.resource_attributes,
        resource_dropped_attributes_count: base.resource_dropped_attributes_count,
        resource_schema_url: base.resource_schema_url,
        scope_name: base.scope_name,
        scope_version: base.scope_version,
        scope_attributes: base.scope_attributes,
        scope_dropped_attributes_count: base.scope_dropped_attributes_count,
        scope_schema_url: base.scope_schema_url,
        attributes,
        start_time_ns: if start_time_ns == 0 {
            None
        } else {
            Some(start_time_ns)
        },
        time_ns,
        value_double,
        int_value,
        count,
        sum,
        min,
        max,
        exemplars,
        flags,
        data,
    }
}

fn number_values(point: &NumberDataPoint) -> (Option<f64>, Option<i64>) {
    match &point.value {
        Some(opentelemetry_proto::tonic::metrics::v1::number_data_point::Value::AsDouble(v)) => {
            (Some(*v), None)
        }
        Some(opentelemetry_proto::tonic::metrics::v1::number_data_point::Value::AsInt(v)) => {
            (None, Some(*v))
        }
        None => (None, None),
    }
}

fn number_point_json(point: &NumberDataPoint) -> Value {
    json!({
        "attributes": key_values_to_json(&point.attributes),
        "startTimeUnixNano": point.start_time_unix_nano.to_string(),
        "timeUnixNano": point.time_unix_nano.to_string(),
        "value": match &point.value {
            Some(opentelemetry_proto::tonic::metrics::v1::number_data_point::Value::AsDouble(v)) => json!({"asDouble": v}),
            Some(opentelemetry_proto::tonic::metrics::v1::number_data_point::Value::AsInt(v)) => json!({"asInt": v.to_string()}),
            None => Value::Null,
        },
        "exemplars": exemplars_json(&point.exemplars),
        "flags": point.flags,
    })
}

fn histogram_point_json(point: &HistogramDataPoint) -> Value {
    json!({
        "attributes": key_values_to_json(&point.attributes),
        "startTimeUnixNano": point.start_time_unix_nano.to_string(),
        "timeUnixNano": point.time_unix_nano.to_string(),
        "count": point.count.to_string(),
        "sum": point.sum,
        "bucketCounts": point.bucket_counts,
        "explicitBounds": point.explicit_bounds,
        "min": point.min,
        "max": point.max,
        "exemplars": exemplars_json(&point.exemplars),
        "flags": point.flags,
    })
}

fn exponential_histogram_point_json(point: &ExponentialHistogramDataPoint) -> Value {
    json!({
        "attributes": key_values_to_json(&point.attributes),
        "startTimeUnixNano": point.start_time_unix_nano.to_string(),
        "timeUnixNano": point.time_unix_nano.to_string(),
        "count": point.count.to_string(),
        "sum": point.sum,
        "scale": point.scale,
        "zeroCount": point.zero_count.to_string(),
        "zeroThreshold": point.zero_threshold,
        "positive": point.positive,
        "negative": point.negative,
        "min": point.min,
        "max": point.max,
        "exemplars": exemplars_json(&point.exemplars),
        "flags": point.flags,
    })
}

fn summary_point_json(point: &SummaryDataPoint) -> Value {
    json!({
        "attributes": key_values_to_json(&point.attributes),
        "startTimeUnixNano": point.start_time_unix_nano.to_string(),
        "timeUnixNano": point.time_unix_nano.to_string(),
        "count": point.count.to_string(),
        "sum": point.sum,
        "quantileValues": point.quantile_values,
        "flags": point.flags,
    })
}

fn exemplars_json(exemplars: &[Exemplar]) -> Value {
    Value::Array(
        exemplars
            .iter()
            .map(|ex| {
                json!({
                    "filteredAttributes": key_values_to_json(&ex.filtered_attributes),
                    "timeUnixNano": ex.time_unix_nano.to_string(),
                    "value": match &ex.value {
                        Some(opentelemetry_proto::tonic::metrics::v1::exemplar::Value::AsDouble(v)) => json!({"asDouble": v}),
                        Some(opentelemetry_proto::tonic::metrics::v1::exemplar::Value::AsInt(v)) => json!({"asInt": v.to_string()}),
                        None => Value::Null,
                    },
                    "spanId": domain::optional_span_id_bytes(&ex.span_id),
                    "traceId": domain::optional_trace_id_bytes(&ex.trace_id),
                })
            })
            .collect(),
    )
}

fn validate_histogram(point: &HistogramDataPoint) -> Result<(), OtlpError> {
    if point.explicit_bounds.is_empty() && point.bucket_counts.is_empty() {
        return Ok(());
    }
    if point.bucket_counts.len() != point.explicit_bounds.len() + 1 {
        return Err(OtlpError::Validation(
            "histogram bucket count mismatch".into(),
        ));
    }
    for window in point.explicit_bounds.windows(2) {
        if window[0] >= window[1] {
            return Err(OtlpError::Validation(
                "histogram explicit bounds must be strictly increasing".into(),
            ));
        }
    }
    let bucket_sum: u64 = point.bucket_counts.iter().sum();
    if bucket_sum != point.count {
        return Err(OtlpError::Validation(
            "histogram bucket counts must sum to count".into(),
        ));
    }
    Ok(())
}

fn validate_exponential_histogram(point: &ExponentialHistogramDataPoint) -> Result<(), OtlpError> {
    let positive: u64 = point.positive.as_ref().map(|b| b.bucket_counts.iter().sum()).unwrap_or(0);
    let negative: u64 = point.negative.as_ref().map(|b| b.bucket_counts.iter().sum()).unwrap_or(0);
    if positive + negative + point.zero_count != point.count {
        return Err(OtlpError::Validation(
            "exponential histogram bucket counts must sum to count".into(),
        ));
    }
    Ok(())
}

fn validate_summary(point: &SummaryDataPoint) -> Result<(), OtlpError> {
    for q in &point.quantile_values {
        if q.quantile < 0.0 || q.quantile > 1.0 {
            return Err(OtlpError::Validation(
                "summary quantile must be within [0,1]".into(),
            ));
        }
    }
    Ok(())
}

pub fn map_metrics_json(body: &[u8]) -> Result<Vec<MetricDataPoint>, OtlpError> {
    let request: ExportMetricsServiceRequest = serde_json::from_slice(body)
        .map_err(|e| OtlpError::InvalidPayload(format!("json decode failed: {e}")))?;
    map_metrics(request)
}

pub fn map_metrics_protobuf(body: &[u8]) -> Result<Vec<MetricDataPoint>, OtlpError> {
    let request = ExportMetricsServiceRequest::decode(body)
        .map_err(|e| OtlpError::InvalidPayload(format!("protobuf decode failed: {e}")))?;
    map_metrics(request)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_histogram_bucket_counts() {
        let point = HistogramDataPoint {
            attributes: vec![],
            start_time_unix_nano: 1,
            time_unix_nano: 2,
            count: 3,
            sum: Some(1.0),
            bucket_counts: vec![1, 2],
            explicit_bounds: vec![1.0],
            min: Some(0.0),
            max: Some(0.0),
            exemplars: vec![],
            flags: 0,
        };
        assert!(validate_histogram(&point).is_ok());
    }
}

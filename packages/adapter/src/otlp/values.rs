use base64::{engine::general_purpose::STANDARD, Engine as _};
use common::nest_dotted_keys;
use opentelemetry_proto::tonic::common::v1::{any_value, AnyValue, KeyValue};
use serde_json::{json, Map, Value};

/// Largest integer that can be represented exactly in IEEE-754 / JS Number.
const JSON_SAFE_INT_MAX: i64 = 9_007_199_254_740_991;

pub fn key_values_to_json(values: &[KeyValue]) -> Value {
    let mut map = Map::new();
    for kv in values {
        map.insert(kv.key.clone(), any_value_to_json(kv.value.as_ref()));
    }
    nest_dotted_keys(&Value::Object(map))
}

pub fn any_value_to_json(value: Option<&AnyValue>) -> Value {
    match value.and_then(|v| v.value.as_ref()) {
        None => Value::Null,
        Some(any_value::Value::StringValue(v)) => Value::String(v.clone()),
        Some(any_value::Value::StringValueStrindex(v)) => json!(v),
        Some(any_value::Value::BoolValue(v)) => Value::Bool(*v),
        Some(any_value::Value::IntValue(v)) => int_to_json(*v),
        Some(any_value::Value::DoubleValue(v)) => json!(v),
        Some(any_value::Value::BytesValue(v)) => Value::String(STANDARD.encode(v)),
        Some(any_value::Value::ArrayValue(arr)) => Value::Array(
            arr.values
                .iter()
                .map(|v| any_value_to_json(Some(v)))
                .collect(),
        ),
        Some(any_value::Value::KvlistValue(list)) => key_values_to_json(&list.values),
    }
}

fn int_to_json(v: i64) -> Value {
    if (-JSON_SAFE_INT_MAX..=JSON_SAFE_INT_MAX).contains(&v) {
        json!(v)
    } else {
        Value::String(v.to_string())
    }
}

pub fn service_name_from_resource(values: &[KeyValue]) -> String {
    values
        .iter()
        .find(|kv| kv.key == "service.name")
        .and_then(|kv| match kv.value.as_ref().and_then(|v| v.value.as_ref()) {
            Some(any_value::Value::StringValue(s)) => Some(s.clone()),
            _ => None,
        })
        .unwrap_or_else(|| "unknown_service".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn large_int_serializes_as_string() {
        let value = AnyValue {
            value: Some(any_value::Value::IntValue(9007199254740993)),
        };
        let json = any_value_to_json(Some(&value));
        assert_eq!(json, Value::String("9007199254740993".into()));
    }

    #[test]
    fn safe_int_serializes_as_number() {
        let value = AnyValue {
            value: Some(any_value::Value::IntValue(42)),
        };
        let json = any_value_to_json(Some(&value));
        assert_eq!(json, json!(42));
    }

    #[test]
    fn key_values_flatten_to_object() {
        let values = vec![
            KeyValue {
                key: "http.route".into(),
                value: Some(AnyValue {
                    value: Some(any_value::Value::StringValue("/invoices".into())),
                }),
                key_strindex: 0,
            },
            KeyValue {
                key: "express.name".into(),
                value: Some(AnyValue {
                    value: Some(any_value::Value::StringValue("/presigned-urls".into())),
                }),
                key_strindex: 0,
            },
            KeyValue {
                key: "express.type".into(),
                value: Some(AnyValue {
                    value: Some(any_value::Value::StringValue("router".into())),
                }),
                key_strindex: 0,
            },
        ];
        let json = key_values_to_json(&values);
        assert_eq!(
            json,
            json!({
                "http": { "route": "/invoices" },
                "express": {
                    "name": "/presigned-urls",
                    "type": "router",
                },
            })
        );
    }
}

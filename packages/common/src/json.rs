use serde_json::{Map, Value};

pub fn json_str(value: &Value) -> String {
    serde_json::to_string(value).unwrap_or_else(|_| "null".into())
}

pub fn opt_json_str(value: &Option<Value>) -> Option<String> {
    value.as_ref().map(json_str)
}

pub fn parse_json(raw: &str) -> Value {
    serde_json::from_str(raw).unwrap_or(Value::Null)
}

/// Resolve a dotted path on nested JSON, with a flat-key fallback.
///
/// Returns a string for string/number leaves; other types yield `None`.
pub fn read_attr_path(attrs: &Value, path: &str) -> Option<String> {
    if let Some(value) = attrs.get(path).and_then(coerce_attr_value) {
        return Some(value);
    }

    let mut current = attrs;
    for segment in path.split('.').filter(|s| !s.is_empty()) {
        current = current.get(segment)?;
    }
    coerce_attr_value(current)
}

/// First matching dotted path, same semantics as the frontend `readAttr`.
pub fn read_attr(attrs: &Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| read_attr_path(attrs, key))
}

fn coerce_attr_value(value: &Value) -> Option<String> {
    match value {
        Value::String(s) if !s.is_empty() => Some(s.clone()),
        Value::Number(n) => Some(n.to_string()),
        _ => None,
    }
}

/// Expand dotted object keys into nested objects.
///
/// `{ "http.method": "POST", "net.host.port": 4000 }` becomes
/// `{ "http": { "method": "POST" }, "net": { "host": { "port": 4000 } } }`.
///
/// Already-nested trees are handled recursively and remain valid (idempotent for
/// keys that do not contain `.`).
pub fn nest_dotted_keys(value: &Value) -> Value {
    match value {
        Value::Object(map) => {
            let mut nested = Map::new();
            for (key, child) in map {
                let nested_child = nest_dotted_keys(child);
                let segments: Vec<&str> = key.split('.').filter(|s| !s.is_empty()).collect();
                insert_path(&mut nested, &segments, nested_child);
            }
            Value::Object(nested)
        }
        Value::Array(items) => Value::Array(items.iter().map(nest_dotted_keys).collect()),
        other => other.clone(),
    }
}

fn insert_path(map: &mut Map<String, Value>, segments: &[&str], value: Value) {
    match segments {
        [] => {}
        [leaf] => {
            map.insert((*leaf).to_string(), value);
        }
        [head, rest @ ..] => {
            let entry = map
                .entry((*head).to_string())
                .or_insert_with(|| Value::Object(Map::new()));

            if !entry.is_object() {
                *entry = Value::Object(Map::new());
            }

            if let Value::Object(child) = entry {
                insert_path(child, rest, value);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn nests_dotted_keys() {
        let input = json!({
            "http.method": "POST",
            "net.host.name": "localhost",
            "net.host.port": 4000,
        });

        assert_eq!(
            nest_dotted_keys(&input),
            json!({
                "http": { "method": "POST" },
                "net": { "host": { "name": "localhost", "port": 4000 } },
            })
        );
    }

    #[test]
    fn is_idempotent_on_nested_objects() {
        let nested = json!({
            "http": { "method": "POST" },
            "service": { "name": "api" },
        });

        assert_eq!(nest_dotted_keys(&nested), nested);
    }

    #[test]
    fn nests_inside_arrays() {
        let input = json!([{ "attributes": { "db.system": "postgresql" } }]);

        assert_eq!(
            nest_dotted_keys(&input),
            json!([{ "attributes": { "db": { "system": "postgresql" } } }])
        );
    }

    #[test]
    fn last_write_wins_on_same_leaf() {
        let mut map = Map::new();
        insert_path(&mut map, &["http", "method"], json!("GET"));
        insert_path(&mut map, &["http", "method"], json!("POST"));
        assert_eq!(Value::Object(map), json!({ "http": { "method": "POST" } }));
    }

    #[test]
    fn read_attr_supports_nested_and_flat_keys() {
        let nested = json!({ "http": { "request": { "method": "GET" } } });
        assert_eq!(
            read_attr_path(&nested, "http.request.method").as_deref(),
            Some("GET")
        );

        let flat = json!({ "http.request.method": "POST" });
        assert_eq!(
            read_attr_path(&flat, "http.request.method").as_deref(),
            Some("POST")
        );

        assert_eq!(
            read_attr(&nested, &["http.method", "http.request.method"]).as_deref(),
            Some("GET")
        );
    }
}

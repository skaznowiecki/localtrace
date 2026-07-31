/// Collapse dynamic path segments (numeric ids, UUIDs, long hex digests) into a
/// canonical `:id` placeholder so concrete request paths group by endpoint
/// pattern (`/users/123` and `/users/456` → `/users/:id`).
///
/// Idempotent over already-templated routes: `:param` and `{param}` segments
/// are normalized to `:id` as well, so different template syntaxes group
/// together. Segments that are not obviously dynamic (API versions like `v1`,
/// resource names, actions) are preserved.
pub fn normalize_route_path(path: &str) -> String {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    trimmed
        .split('/')
        .map(|segment| {
            if !segment.is_empty() && is_dynamic_segment(segment) {
                ":id"
            } else {
                segment
            }
        })
        .collect::<Vec<_>>()
        .join("/")
}

fn is_dynamic_segment(segment: &str) -> bool {
    // Existing template placeholders (`:id`, `{id}`) → canonical `:id`.
    if segment.starts_with(':') || (segment.starts_with('{') && segment.ends_with('}')) {
        return true;
    }

    // Pure numeric id (`123`, `0`).
    if segment.chars().all(|c| c.is_ascii_digit()) {
        return true;
    }

    if is_uuid(segment) {
        return true;
    }

    // Long hex digest (object ids, hashes). Require at least one digit so
    // hex-looking words (`facebook`, `deadbeef`) are not collapsed.
    let len = segment.len();
    len >= 12
        && segment.chars().all(|c| c.is_ascii_hexdigit())
        && segment.chars().any(|c| c.is_ascii_digit())
}

fn is_uuid(segment: &str) -> bool {
    if segment.len() != 36 {
        return false;
    }
    segment.chars().enumerate().all(|(i, c)| match i {
        8 | 13 | 18 | 23 => c == '-',
        _ => c.is_ascii_hexdigit(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn collapses_numeric_ids() {
        assert_eq!(normalize_route_path("/users/123"), "/users/:id");
        assert_eq!(normalize_route_path("/users/123/orders/456"), "/users/:id/orders/:id");
    }

    #[test]
    fn keeps_static_segments() {
        assert_eq!(normalize_route_path("/api/v1/health"), "/api/v1/health");
        assert_eq!(normalize_route_path("/"), "/");
    }

    #[test]
    fn is_idempotent_over_templates() {
        assert_eq!(normalize_route_path("/users/:id"), "/users/:id");
        assert_eq!(normalize_route_path("/users/{id}"), "/users/:id");
        assert_eq!(normalize_route_path("/users/{userId}"), "/users/:id");
    }

    #[test]
    fn collapses_uuid_and_hex_digests() {
        assert_eq!(
            normalize_route_path("/items/550e8400-e29b-41d4-a716-446655440000"),
            "/items/:id"
        );
        assert_eq!(
            normalize_route_path("/blobs/9f86d081884c7d659a2feaa0c55ad015"),
            "/blobs/:id"
        );
    }

    #[test]
    fn preserves_hex_words_without_digits() {
        assert_eq!(normalize_route_path("/feed/deadbeefcafe"), "/feed/deadbeefcafe");
    }

    #[test]
    fn empty_stays_empty() {
        assert_eq!(normalize_route_path(""), "");
        assert_eq!(normalize_route_path("   "), "");
    }
}

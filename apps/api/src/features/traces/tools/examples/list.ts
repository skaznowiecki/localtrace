export const examples = [
  {
    description: "Recent error traces",
    arguments: { status: "error" as const, limit: 20 },
  },
  {
    description: "One service since an RFC3339 timestamp",
    arguments: { service: "api", since: "2026-08-17T00:00:00Z" },
  },
  {
    description: "Slow HTTP 5xx",
    arguments: { http_status_code: 500, duration_min_ms: 1000 },
  },
  {
    description: "Slowest traces first",
    arguments: { sort: "duration" as const, order: "desc" as const, limit: 20 },
  },
]

export const examples = [
  {
    description: "Recent error traces",
    arguments: { status: "error" as const, since_minutes: 15, limit: 20 },
  },
  {
    description: "One service in the last hour",
    arguments: { service: "api", since_minutes: 60 },
  },
  {
    description: "Slow HTTP 5xx",
    arguments: { http_status_code: 500, duration_min_ms: 1000 },
  },
  {
    description: "Traces with a span attribute",
    arguments: { attr: ["account.id:123"] },
  },
  {
    description: "Slowest traces first",
    arguments: { sort: "duration" as const, order: "desc" as const, limit: 20 },
  },
]

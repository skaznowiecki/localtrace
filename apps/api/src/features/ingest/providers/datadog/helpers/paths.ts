export const TRACE_JSON_PATHS = new Set(["/v0.3/traces", "/v0.4/traces"])

export const TRACE_MSGPACK_PATHS = new Set([
  "/v0.3/traces",
  "/v0.4/traces",
  "/v0.5/traces",
  "/v0.7/traces",
])

export function isLogsPath(path: string): boolean {
  return (
    path === "/v1/input" ||
    path.startsWith("/v1/input/") ||
    path === "/api/v2/logs"
  )
}

export function isMetricsPath(path: string): boolean {
  return path === "/api/v1/series" || path === "/api/v2/series"
}

export function isMsgpack(type: string): boolean {
  return type === "application/msgpack" || type === "application/x-msgpack"
}

export function isJson(type: string): boolean {
  return type === "application/json" || type === "application/x-ndjson"
}

export function tracesSuccess(path: string): Response {
  if (path.includes("/v0.3/")) return new Response(null, { status: 200 })
  return Response.json({ rate_by_service: { "service:,env:": 1 } })
}

export function jsonOk(): Response {
  return new Response("{}", {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

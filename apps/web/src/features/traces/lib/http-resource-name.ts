const HTTP_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "TRACE",
  "CONNECT",
])

/** True when the display name is a bare HTTP verb (e.g. CORS `OPTIONS`). */
export function isHttpMethodOnlyName(name: string): boolean {
  return HTTP_METHODS.has(name.trim().toUpperCase())
}

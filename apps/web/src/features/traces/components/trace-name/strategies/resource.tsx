import { HttpMethodBadge } from "../../display/HttpMethodBadge"
import { HttpPath } from "../../display/HttpPath"
import type { TraceNameInput, TraceNameStrategy } from "../types"

/**
 * HTTP resource names in the traces list:
 * - `GET /users` → badge + path
 * - `OPTIONS` alone (CORS) + `path` override (route from the API) → badge + path
 * - `OPTIONS` alone without override → gray badge only
 */
const RESOURCE_PATTERN =
  /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|CONNECT|TRACE)(?:\s+(\S.*))?$/i

function parseResource(name: string) {
  const match = RESOURCE_PATTERN.exec(name.trim())
  if (!match) return null
  const path = match[2]?.trim()
  return {
    method: match[1]!.toUpperCase(),
    path: path && path.length > 0 ? path : null,
  }
}

/**
 * Prefer the denormalized path from the API (`http.route`, e.g. `/users/:id`)
 * so every HTTP row shares one source and groups by endpoint; fall back to the
 * path embedded in the span name when the API has none.
 */
function resolvePath(input: TraceNameInput, parsedPath: string | null) {
  const override = input.path?.trim()
  if (override && override.length > 0) return override
  return parsedPath
}

export const resourceStrategy: TraceNameStrategy = {
  id: "resource",
  match: (input) => parseResource(input.name) != null,
  render: (input) => {
    const parsed = parseResource(input.name)
    if (!parsed) return input.name

    const path = resolvePath(input, parsed.path)
    const title = path ? `${parsed.method} ${path}` : parsed.method

    return (
      <span
        className="inline-flex min-w-0 max-w-full items-center gap-1.5"
        title={title}
      >
        <HttpMethodBadge method={parsed.method} />
        {path ? <HttpPath value={path} /> : null}
      </span>
    )
  },
}

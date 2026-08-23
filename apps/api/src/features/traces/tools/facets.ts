import type { McpServer } from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import { jsonResult } from "@shared/helpers"
import { input } from "../schemas/facets"
import { execute } from "../services/facets"

export function register(server: McpServer, db: Db) {
  server.registerTool(
    "list_facets",
    {
      title: "List facets",
      description:
        "Counted services, statuses, HTTP methods, status codes, routes, and duration buckets — use these values as filters for list_traces.",
      inputSchema: input,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async () => jsonResult(() => execute(db)),
  )
}

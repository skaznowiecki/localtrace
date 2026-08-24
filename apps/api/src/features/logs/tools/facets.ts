import type { McpServer } from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import { jsonResult, objectSchema } from "@shared/helpers"
import { input } from "../schemas/facets"
import { execute } from "../services/facets"

export function register(server: McpServer, db: Db) {
  server.registerTool(
    "list_log_facets",
    {
      title: "List log facets",
      description:
        "Counted services and severity buckets — use these values as filters for list_logs.",
      inputSchema: input,
      outputSchema: objectSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async () => jsonResult(() => execute(db)),
  )
}

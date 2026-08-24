import type { McpServer } from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import { jsonResult, objectSchema } from "@shared/helpers"
import { input } from "../schemas/facets"
import { execute } from "../services/facets"

export function register(server: McpServer, db: Db) {
  server.registerTool(
    "list_metric_facets",
    {
      title: "List metric facets",
      description:
        "Counted metric names and services. Use these values as filters for query_metrics.",
      inputSchema: input,
      outputSchema: objectSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async () => jsonResult(() => execute(db)),
  )
}

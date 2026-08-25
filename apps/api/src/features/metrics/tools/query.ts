import type { McpServer } from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import { itemsSchema, jsonResult } from "@shared/helpers"
import { filters, input } from "../schemas/query"
import { execute } from "../services/query"

export function register(server: McpServer, db: Db) {
  server.registerTool(
    "query_metrics",
    {
      title: "Query metrics",
      description:
        "Recent metric points. Filter by name and optional service. Omit name to list recent points across names. Prefer since_minutes. Returns id, time, value, count, and sum.",
      inputSchema: input,
      outputSchema: itemsSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async (args) =>
      jsonResult(async () => ({ items: await execute(db, filters(args)) })),
  )
}

import type { McpServer } from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import { jsonResult } from "@shared/helpers"
import * as schema from "../schemas/list"
import { execute } from "../services/list"

export function register(server: McpServer, db: Db) {
  server.registerTool(
    "list_logs",
    {
      title: "List logs",
      description: [
        "List recent logs. Call list_log_facets first to discover valid filter values.",
        "sort/order default to date desc.",
      ].join("\n"),
      inputSchema: schema.input,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async (args) => jsonResult(() => execute(db, schema.filters(args))),
  )
}

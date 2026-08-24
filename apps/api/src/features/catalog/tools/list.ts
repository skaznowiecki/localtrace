import type { McpServer } from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import { itemsSchema, jsonResult } from "@shared/helpers"
import { input } from "../schemas/list"
import { execute } from "../services/list"

export function register(server: McpServer, db: Db) {
  server.registerTool(
    "list_services",
    {
      title: "List services",
      description: "Services that have ingested traces, with trace counts.",
      inputSchema: input,
      outputSchema: itemsSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async () => jsonResult(async () => ({ items: await execute(db) })),
  )
}

import type { McpServer } from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import { itemsSchema, jsonResult } from "@shared/helpers"
import { input } from "../schemas/search"
import { execute } from "../services/search"

export function register(server: McpServer, db: Db) {
  server.registerTool(
    "search_spans",
    {
      title: "Search spans",
      description:
        "Search recent spans by name/attribute substring, type, service, and status. Scans at most 2000 recent matching rows. Prefer since_minutes. Use this for slow SQL across traces or attribute hunt; then get_span / get_trace.",
      inputSchema: input,
      outputSchema: itemsSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async (args) => jsonResult(async () => ({ items: await execute(db, args) })),
  )
}

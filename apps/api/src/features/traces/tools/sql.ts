import type { McpServer } from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import { jsonResult } from "@shared/helpers"
import { input } from "../schemas/sql"
import { execute } from "../services/sql"

export function register(server: McpServer, db: Db) {
  server.registerTool(
    "get_trace_sql",
    {
      title: "Get trace SQL",
      description:
        "SQL queries in a trace (db.statement / db.query.text), sorted by duration. Empty if the trace has no DB spans.",
      inputSchema: input,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ trace_id }) => jsonResult(() => execute(db, trace_id)),
  )
}

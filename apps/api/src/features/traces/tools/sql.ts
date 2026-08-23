import type { McpServer } from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import { jsonResult } from "@shared/helpers"
import { input } from "../schemas/sql"
import { execute } from "../services/sql"

export function register(server: McpServer, db: Db) {
  server.registerTool(
    "get_trace_sql",
    {
      title: "Get trace DB queries",
      description:
        "DB queries in a trace (Postgres, MySQL, SQLite, ClickHouse, …), sorted by duration. Uses db.statement / db.query.text when present; ClickHouse often only has db.operation. Empty if the trace has no DB spans.",
      inputSchema: input,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ trace_id }) => jsonResult(() => execute(db, trace_id)),
  )
}

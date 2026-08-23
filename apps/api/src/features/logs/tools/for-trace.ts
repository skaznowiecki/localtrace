import type { McpServer } from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import { jsonResult } from "@shared/helpers"
import { input } from "../schemas/for-trace"
import { execute } from "../services/for-trace"

export function register(server: McpServer, db: Db) {
  server.registerTool(
    "get_trace_logs",
    {
      title: "Get trace logs",
      description: "Logs correlated to a trace, ordered as stored. Empty if none.",
      inputSchema: input,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ trace_id, raw }) => jsonResult(() => execute(db, trace_id, raw ?? false)),
  )
}

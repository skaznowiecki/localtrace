import type { McpServer } from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import { jsonResult } from "@shared/helpers"
import { input } from "../schemas/with-spans"
import { execute } from "../services/with-spans"

export function register(server: McpServer, db: Db) {
  server.registerTool(
    "get_trace",
    {
      title: "Get trace",
      description:
        "Full trace with spans, attributes, events, and resource attributes. trace.breakdown is exclusive time rolled up to Prisma ops, outbound HTTP, Redis, and SQL (remainder App); null means still processing — retry shortly. Use get_trace_sql for SQL spans and get_trace_logs for correlated logs.",
      inputSchema: input,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ trace_id, raw }) => jsonResult(() => execute(db, trace_id, raw ?? false)),
  )
}

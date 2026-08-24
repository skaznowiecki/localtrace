import type { McpServer } from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import { itemsSchema, jsonResult } from "@shared/helpers"
import { input } from "../schemas/spans-by-type"
import { execute } from "../services/spans-by-type"

export function register(server: McpServer, db: Db) {
  server.registerTool(
    "get_trace_spans",
    {
      title: "Get typed spans in a trace",
      description:
        "Compact typed payloads for spans in a trace. type=sql|redis|mongo|prisma|http|express|s3|openrouter|trpc|error. For SQL, get_trace_sql is the same extractor with share ranking.",
      inputSchema: input,
      outputSchema: itemsSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ trace_id, type }) =>
      jsonResult(async () => ({ items: await execute(db, trace_id, type) })),
  )
}

import type { McpServer } from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import { jsonResult, objectSchema } from "@shared/helpers"
import { input } from "../schemas/span"
import { execute } from "../services/span"

export function register(server: McpServer, db: Db) {
  server.registerTool(
    "get_span",
    {
      title: "Get span",
      description:
        "One span with attributes (truncated if huge). Pass trace_id if span_id is not unique. Prefer this over get_trace detail=full.",
      inputSchema: input,
      outputSchema: objectSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ span_id, trace_id, raw }) =>
      jsonResult(() => execute(db, span_id, trace_id, raw ?? false)),
  )
}

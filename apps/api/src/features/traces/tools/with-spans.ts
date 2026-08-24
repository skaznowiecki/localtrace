import type { McpServer } from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import { jsonResult, objectSchema } from "@shared/helpers"
import { input } from "../schemas/with-spans"
import { execute as overview } from "../services/overview"
import { execute as withSpans } from "../services/with-spans"

export function register(server: McpServer, db: Db) {
  server.registerTool(
    "get_trace",
    {
      title: "Get trace",
      description:
        "Trace overview by default: card, compact span tree (no attributes), counts, and hints. Pass detail=full only when you need every span attribute. breakdown null means still processing — retry shortly. Use get_span for attributes, get_trace_spans / get_trace_sql for typed payloads, get_trace_logs for logs. Do not call this in a loop over list_traces.",
      inputSchema: input,
      outputSchema: objectSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ trace_id, raw, detail }) =>
      jsonResult(() =>
        detail === "full"
          ? withSpans(db, trace_id, raw ?? false)
          : overview(db, trace_id),
      ),
  )
}

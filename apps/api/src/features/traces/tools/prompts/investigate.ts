import { completable, type McpServer } from "@modelcontextprotocol/server"
import * as z from "zod"
import type { Db } from "@shared/db"
import { traceId } from "@shared/helpers"
import { filters } from "../../schemas/list"
import { execute as list } from "../../services/list"

async function completeTraceId(db: Db, prefix: string): Promise<string[]> {
  const traces = await list(db, filters({ limit: 20 }))
  const needle = prefix.toLowerCase()
  return traces
    .map((trace) => trace.id)
    .filter((id) => id.startsWith(needle) || needle.length === 0)
    .slice(0, 20)
}

export function register(server: McpServer, db: Db) {
  server.registerPrompt(
    "investigate_trace",
    {
      title: "Investigate a trace",
      description:
        "Walk a single trace: overview, slow SQL, correlated logs, and error status.",
      argsSchema: z.object({
        trace_id: completable(traceId.describe("32-char hex trace id"), (value) =>
          completeTraceId(db, value),
        ),
      }),
    },
    ({ trace_id }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Investigate trace ${trace_id}.`,
              "1. get_trace (overview) for the span tree, status, HTTP fields, counts, and hints.",
              "2. If trace.breakdown is null, retry get_trace shortly (still processing).",
              "3. get_trace_sql or get_trace_spans type=sql for the slowest queries.",
              "4. get_span on error spans; get_trace_logs for correlated logs.",
              "Summarize what failed or was slow, with span ids and durations.",
            ].join("\n"),
          },
        },
      ],
    }),
  )
}

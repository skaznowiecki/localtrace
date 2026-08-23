import type { McpServer } from "@modelcontextprotocol/server"
import { input } from "../../schemas/with-spans"

export function register(server: McpServer) {
  server.registerPrompt(
    "investigate_trace",
    {
      title: "Investigate a trace",
      description:
        "Walk a single trace: overview, slow SQL, correlated logs, and error status.",
      argsSchema: input,
    },
    ({ trace_id }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Investigate trace ${trace_id}.`,
              "1. get_trace for the span tree, status, HTTP fields, and span-group breakdown.",
              "2. If trace.breakdown is null, retry get_trace shortly (still processing). If it is an array, use it as exclusive time per Prisma op / HTTP / Redis / SQL / App.",
              "3. get_trace_sql for the slowest queries (if any).",
              "4. get_trace_logs for errors and messages on the same trace_id.",
              "Summarize what failed or was slow, with span ids and durations.",
            ].join("\n"),
          },
        },
      ],
    }),
  )
}

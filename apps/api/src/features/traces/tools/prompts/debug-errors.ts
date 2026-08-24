import type { McpServer } from "@modelcontextprotocol/server"
import { sinceMinutes } from "../../schemas/prompts"

export function register(server: McpServer) {
  server.registerPrompt(
    "debug_errors",
    {
      title: "Debug recent errors",
      description:
        "Find and explain error traces in a recent time window.",
      argsSchema: sinceMinutes,
    },
    ({ since_minutes }) => {
      const minutes = since_minutes ?? 15
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: [
                `Debug error traces from the last ${minutes} minutes.`,
                "1. list_facets if you need valid service names.",
                `2. list_traces with status=error and since_minutes=${minutes}.`,
                "3. For the top few traces, get_trace (overview) — do not loop get_trace over the whole list.",
                "4. Drill in with get_trace_spans type=error, get_span, get_trace_sql, and get_trace_logs.",
                "Summarize failing services, likely causes, and the slowest/error spans.",
              ].join("\n"),
            },
          },
        ],
      }
    },
  )
}

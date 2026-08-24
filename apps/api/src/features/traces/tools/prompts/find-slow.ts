import type { McpServer } from "@modelcontextprotocol/server"
import { sinceMinutes } from "../../schemas/prompts"

export function register(server: McpServer) {
  server.registerPrompt(
    "find_slow",
    {
      title: "Find slow traces",
      description: "Find the slowest traces in a recent time window.",
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
                `Find the slowest traces from the last ${minutes} minutes.`,
                `1. list_traces with since_minutes=${minutes}, sort=duration, order=desc.`,
                "2. get_trace overview on the slowest few (not the whole list).",
                "3. Use breakdown plus get_trace_sql / get_trace_spans type=http or redis to explain where time went.",
                "Summarize the slowest routes and the dominant span types.",
              ].join("\n"),
            },
          },
        ],
      }
    },
  )
}

import type { McpServer } from "@modelcontextprotocol/server"
import * as z from "zod"

export function register(server: McpServer) {
  server.registerPrompt(
    "investigate_log",
    {
      title: "Investigate a log",
      description:
        "Debug a log line: embed the message, then pivot to the correlated trace when a trace_id is present.",
      argsSchema: z.object({
        message: z.string().optional().describe("Log message or substring"),
        service: z.string().optional().describe("Service name"),
        severity: z.string().optional().describe("OTLP severity bucket"),
        trace_id: z
          .string()
          .optional()
          .describe("Correlated 32-char hex trace id, if known"),
        span_id: z
          .string()
          .optional()
          .describe("Correlated 16-char hex span id, if known"),
      }),
    },
    ({ message, service, severity, trace_id, span_id }) => {
      const context = [
        message ? `- message: ${message}` : null,
        service ? `- service: ${service}` : null,
        severity ? `- severity: ${severity}` : null,
        `- trace_id: ${trace_id || "none"}`,
        span_id ? `- span_id: ${span_id}` : null,
      ].filter((line): line is string => line !== null)

      const tools = trace_id
        ? [
            `1. get_trace { "trace_id": "${trace_id}" }`,
            "   If breakdown is null, retry shortly (still processing).",
            `2. get_trace_logs { "trace_id": "${trace_id}" }`,
            span_id
              ? `3. get_span { "trace_id": "${trace_id}", "span_id": "${span_id}" }`
              : "3. get_span on the error span if one appears in the trace.",
          ]
        : [
            `1. list_logs ${JSON.stringify({
              service,
              severity,
              message,
            })}`,
          ]

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: [
                "Investigate this LocalTrace log. Do not invent telemetry — fetch it with the tools below.",
                "",
                "Context:",
                ...context,
                "",
                "Call these tools:",
                ...tools,
                "",
                "Find the cause of this log and whether a related trace failed. Propose a fix.",
              ].join("\n"),
            },
          },
        ],
      }
    },
  )
}

import { formatSpanDuration, formatTraceDate } from "@/lib/utils"

export const MCP_URL = "http://127.0.0.1:4318/mcp"

const LOG_BODY_MAX = 2000
const LOG_SUBSTRING_MAX = 80
const ERROR_HINT_MAX = 240

export type TraceDebugTarget = {
  target: "trace"
  traceId: string
  service: string
  name: string
  status: string
  durationMs: number
  startedAt: string
  httpMethod?: string | null
  httpUrl?: string | null
  httpStatusCode?: string | null
  errorHint?: string | null
}

export type LogDebugTarget = {
  target: "log"
  time: string
  service: string
  severity: string
  message: string
  logId?: string | null
  traceId?: string | null
  spanId?: string | null
}

export type DebugWithAgentProps = TraceDebugTarget | LogDebugTarget

export function buildDebugPrompt(props: DebugWithAgentProps): string {
  return props.target === "trace" ? buildTracePrompt(props) : buildLogPrompt(props)
}

export function truncateText(value: string, max: number): string {
  const text = value.trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

function jsonArgs(args: Record<string, unknown>): string {
  return JSON.stringify(args)
}

function httpLine(props: TraceDebugTarget): string | null {
  const method = props.httpMethod?.trim() || null
  const url = props.httpUrl?.trim() || null
  const code = props.httpStatusCode?.trim() || null
  if (!method && !url && !code) return null
  const request = [method, url].filter(Boolean).join(" ")
  if (request && code) return `${request} → ${code}`
  return request || code
}

function preamble(kind: "trace" | "log"): string {
  return [
    `Debug this Local Tracer ${kind} via the local-tracer MCP (${MCP_URL}).`,
    "Do not invent telemetry — fetch it with the tools below.",
  ].join("\n")
}

function buildTracePrompt(props: TraceDebugTarget): string {
  const context = [
    `- trace_id: ${props.traceId}`,
    `- service: ${props.service}`,
    `- name: ${props.name}`,
    `- status: ${props.status}`,
  ]
  const http = httpLine(props)
  if (http) context.push(`- HTTP: ${http}`)
  context.push(`- duration: ${formatSpanDuration(props.durationMs)}`)
  context.push(`- started: ${formatTraceDate(props.startedAt)}`)
  if (props.errorHint?.trim()) {
    context.push(`- error: ${truncateText(props.errorHint, ERROR_HINT_MAX)}`)
  }

  const traceArgs = jsonArgs({ trace_id: props.traceId })

  return [
    preamble("trace"),
    "",
    "Context:",
    ...context,
    "",
    "Call these tools in order:",
    `1. get_trace ${traceArgs}`,
    "   If breakdown is null, retry shortly (still processing).",
    `2. get_trace_sql ${traceArgs}`,
    `3. get_trace_logs ${traceArgs}`,
    `4. For error spans: get_span ${jsonArgs({ trace_id: props.traceId, span_id: "<span_id>" })}`,
    "   Prefer get_span over get_trace detail=full.",
    `5. If needed: get_trace_spans ${jsonArgs({ trace_id: props.traceId, type: "error" })}`,
    "",
    "Summarize what failed or was slow (span ids + durations), then propose a fix in the app code.",
  ].join("\n")
}

function buildLogPrompt(props: LogDebugTarget): string {
  const message = truncateText(props.message, LOG_BODY_MAX)
  const context = [
    `- time: ${formatTraceDate(props.time)}`,
    `- service: ${props.service}`,
    `- severity: ${props.severity}`,
    `- message: ${message || "(empty)"}`,
  ]
  if (props.logId) context.push(`- log_id: ${props.logId}`)
  if (props.spanId) context.push(`- span_id: ${props.spanId}`)
  context.push(`- trace_id: ${props.traceId?.trim() || "none"}`)

  const tools = props.traceId?.trim()
    ? [
        "Call these tools:",
        `1. get_trace ${jsonArgs({ trace_id: props.traceId })}`,
        "   If breakdown is null, retry shortly (still processing).",
        `2. get_trace_logs ${jsonArgs({ trace_id: props.traceId })}`,
        props.spanId
          ? `3. get_span ${jsonArgs({ trace_id: props.traceId, span_id: props.spanId })}`
          : "3. get_span on the error span if one appears in the trace.",
      ]
    : [
        "Call these tools:",
        `1. list_logs ${jsonArgs({
          service: props.service,
          severity: props.severity,
          message: truncateText(props.message, LOG_SUBSTRING_MAX) || undefined,
        })}`,
      ]

  return [
    preamble("log"),
    "",
    "Context:",
    ...context,
    "",
    ...tools,
    "",
    "Find the cause of this log and whether a related trace failed. Propose a fix.",
  ].join("\n")
}

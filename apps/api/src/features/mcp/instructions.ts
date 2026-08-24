export const instructions = [
  "Local Tracer is a local observability store (traces, logs, metrics).",
  "",
  "Playbook:",
  "1. Call list_facets / list_log_facets / list_metric_facets before filtering by invented values.",
  "2. Prefer since_minutes (e.g. 15) over RFC3339 since.",
  "3. list_traces returns compact cards. Do not call get_trace in a loop over the list.",
  "4. get_trace defaults to overview (tree without attributes). Use get_span for attributes, get_trace_spans or get_trace_sql for typed payloads, get_trace_logs for logs.",
  "5. If trace.breakdown is null, the summary is still processing — retry get_trace shortly.",
  "6. Do not query SQLite directly; these tools are the semantic API.",
].join("\n")

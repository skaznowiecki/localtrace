import type { LogListItem } from "../types"

export function severityLabel(log: Pick<LogListItem, "severityText" | "severityNumber">): string {
  if (log.severityText?.trim()) return log.severityText.trim().toUpperCase()
  if (log.severityNumber == null) return "UNSPECIFIED"
  if (log.severityNumber >= 21) return "FATAL"
  if (log.severityNumber >= 17) return "ERROR"
  if (log.severityNumber >= 13) return "WARN"
  if (log.severityNumber >= 9) return "INFO"
  if (log.severityNumber >= 5) return "DEBUG"
  if (log.severityNumber >= 1) return "TRACE"
  return "UNSPECIFIED"
}

export function bodyToText(body: LogListItem["body"]): string {
  if (body === null || body === undefined) return ""
  if (typeof body === "string") return body
  if (typeof body === "number" || typeof body === "boolean") return String(body)
  try {
    return JSON.stringify(body)
  } catch {
    return String(body)
  }
}

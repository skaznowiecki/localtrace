import {
  RETENTION_HOURS,
  type RetentionHours,
} from "../types/dto"

export const RETENTION_KEY = "retention_hours"

export function isRetentionHours(value: number): value is RetentionHours {
  return (RETENTION_HOURS as readonly number[]).includes(value)
}

export function parseRetentionHours(
  raw: string | undefined,
  fallback: RetentionHours,
): RetentionHours {
  if (raw == null || raw === "") return fallback
  const n = Number.parseInt(raw, 10)
  return isRetentionHours(n) ? n : fallback
}

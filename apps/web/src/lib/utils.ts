import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export function formatSpanDuration(ms: number): string {
  if (ms < 1000) {
    if (ms < 100) return `${Math.round(ms)}ms`
    return `${ms.toFixed(1)}ms`
  }

  const seconds = ms / 1000
  if (seconds >= 10) return `${seconds.toFixed(1)}s`
  return `${seconds.toFixed(2)}s`
}

const TRACE_DATE_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

export function formatTraceDate(iso: string): string {
  const date = new Date(iso)
  const month = TRACE_DATE_MONTHS[date.getMonth()]
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")
  const milliseconds = String(date.getMilliseconds()).padStart(3, "0")

  return `${month} ${day} ${hours}:${minutes}:${seconds}.${milliseconds}`
}

export function formatRelativeTime(iso: string, now = Date.now()): string {
  const diffMs = Math.max(0, now - new Date(iso).getTime())
  const seconds = Math.floor(diffMs / 1000)

  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString()
}

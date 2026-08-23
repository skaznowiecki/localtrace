const SERVICE_COLORS: Record<string, string> = {
  App: "#94A3B8",
  s3: "#E75480",
  "lumon-api": "#5B9BD5",
  "external-api": "#E75480",
  "platform-web": "#8B5CF6",
  "platform-api": "#0D9488",
  mongo: "#2D6A4F",
  redis: "#F97316",
  postgres: "#6366F1",
  "auth-service": "#14B8A6",
  "worker-queue": "#A855F7",
}

const FALLBACK_COLORS = [
  "#5B9BD5",
  "#E75480",
  "#8B5CF6",
  "#0D9488",
  "#2D6A4F",
  "#F97316",
  "#6366F1",
  "#14B8A6",
  "#A855F7",
  "#DC2626",
  "#CA8A04",
  "#0891B2",
  "#DB2777",
  "#4F46E5",
  "#15803D",
  "#C2410C",
]

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

export function getServiceColor(service: string): string {
  if (SERVICE_COLORS[service]) {
    return SERVICE_COLORS[service]
  }

  return FALLBACK_COLORS[hashString(service) % FALLBACK_COLORS.length]
}

/** Distinct bar color per span (service + name). Same name → same color. */
export function getSpanColor(service: string, name: string): string {
  const key = `${service}:${name}`
  return FALLBACK_COLORS[hashString(key) % FALLBACK_COLORS.length]
}

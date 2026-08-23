export const KIND_INTERNAL = 1
export const KIND_SERVER = 2
export const KIND_CLIENT = 3
export const KIND_PRODUCER = 4
export const KIND_CONSUMER = 5

export const STATUS_UNSET = 0
export const STATUS_OK = 1
export const STATUS_ERROR = 2

export function spanKind(
  type: string | undefined,
  meta: Record<string, string>,
): number {
  const kind = (meta["span.kind"] ?? "").toLowerCase()
  if (kind === "server") return KIND_SERVER
  if (kind === "client") return KIND_CLIENT
  if (kind === "producer") return KIND_PRODUCER
  if (kind === "consumer") return KIND_CONSUMER
  const t = (type ?? "").toLowerCase()
  if (t === "web" || t === "server") return KIND_SERVER
  if (
    t === "http" ||
    t === "sql" ||
    t === "postgres" ||
    t === "mysql" ||
    t === "redis" ||
    t === "mongodb" ||
    t === "elasticsearch" ||
    t === "cassandra" ||
    t === "memcached" ||
    t === "db"
  ) {
    return KIND_CLIENT
  }
  return KIND_INTERNAL
}

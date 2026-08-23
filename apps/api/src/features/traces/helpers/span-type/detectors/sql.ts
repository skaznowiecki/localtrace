import { readAttr, readAttrHit } from "@shared/helpers"
import type { Json } from "@shared/helpers"
import type { SpanClass, SpanTypeDetector } from "./types"

export const STATEMENT_KEYS = ["db.statement", "db.query.text"] as const

const SQL_TYPE_BY_SYSTEM: Record<string, string> = {
  postgresql: "postgres",
  postgres: "postgres",
  mysql: "mysql",
  mariadb: "mysql",
  sqlite: "sqlite",
  clickhouse: "clickhouse",
}

export function statementHit(attrs: Json) {
  return readAttrHit(attrs, [...STATEMENT_KEYS])
}

export function dbSystem(attrs: Json): string | undefined {
  return readAttr(attrs, ["db.system"])?.trim().toLowerCase()
}

export function isSqlSystem(system: string | undefined): boolean {
  if (!system) return false
  return system in SQL_TYPE_BY_SYSTEM || system === "sql"
}

function sqlType(system: string | undefined): string {
  if (!system) return "sql"
  return SQL_TYPE_BY_SYSTEM[system] ?? "sql"
}

export const sqlDetector: SpanTypeDetector = {
  id: "sql",
  match: (span): SpanClass | undefined => {
    const system = dbSystem(span.attributes)
    const hit = statementHit(span.attributes)
    if (isSqlSystem(system)) {
      return {
        type: sqlType(system),
        payloadPath: hit?.path,
      }
    }
    if (!hit) return undefined
    return {
      type: sqlType(system),
      payloadPath: hit.path,
    }
  },
}

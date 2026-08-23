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
}

export function statementHit(attrs: Json) {
  return readAttrHit(attrs, [...STATEMENT_KEYS])
}

export function dbSystem(attrs: Json): string | undefined {
  return readAttr(attrs, ["db.system"])?.trim().toLowerCase()
}

function sqlType(system: string | undefined): string {
  if (!system) return "sql"
  return SQL_TYPE_BY_SYSTEM[system] ?? "sql"
}

export const sqlDetector: SpanTypeDetector = {
  id: "sql",
  match: (span): SpanClass | undefined => {
    const hit = statementHit(span.attributes)
    if (!hit) return undefined
    return {
      type: sqlType(dbSystem(span.attributes)),
      payloadPath: hit.path,
    }
  },
}

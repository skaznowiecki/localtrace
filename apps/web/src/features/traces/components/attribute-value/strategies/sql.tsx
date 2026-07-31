import type { ReactNode } from "react"

import type { AttributeValueStrategy } from "../types"

const SQL_START =
  /^\s*(WITH|SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|EXPLAIN|TRUNCATE|BEGIN|COMMIT|ROLLBACK|MERGE|CALL|COPY)\b/i

const SQL_KEYWORDS = [
  "ADD",
  "ALL",
  "ALTER",
  "AND",
  "AS",
  "ASC",
  "BEGIN",
  "BETWEEN",
  "BY",
  "CALL",
  "CASCADE",
  "CASE",
  "CAST",
  "CHECK",
  "COLUMN",
  "COMMIT",
  "CONSTRAINT",
  "COPY",
  "CREATE",
  "CROSS",
  "CURRENT",
  "DEFAULT",
  "DELETE",
  "DESC",
  "DISTINCT",
  "DROP",
  "ELSE",
  "END",
  "EXCEPT",
  "EXISTS",
  "EXPLAIN",
  "FALSE",
  "FETCH",
  "FIRST",
  "FOLLOWING",
  "FOREIGN",
  "FROM",
  "FULL",
  "GRANT",
  "GROUP",
  "HAVING",
  "ILIKE",
  "IN",
  "INDEX",
  "INNER",
  "INSERT",
  "INTERSECT",
  "INTO",
  "IS",
  "JOIN",
  "KEY",
  "LEFT",
  "LIKE",
  "LIMIT",
  "MERGE",
  "NATURAL",
  "NOT",
  "NULL",
  "NULLS",
  "OFFSET",
  "ON",
  "ONLY",
  "OR",
  "ORDER",
  "OUTER",
  "OVER",
  "PARTITION",
  "PRECEDING",
  "PRIMARY",
  "REFERENCES",
  "RETURNING",
  "RIGHT",
  "ROLLBACK",
  "ROW",
  "ROWS",
  "SELECT",
  "SET",
  "TABLE",
  "THEN",
  "TRUE",
  "TRUNCATE",
  "UNION",
  "UNIQUE",
  "UPDATE",
  "USING",
  "VALUES",
  "VIEW",
  "WHEN",
  "WHERE",
  "WITH",
  "WITHOUT",
] as const

const KEYWORD_PATTERN = SQL_KEYWORDS.slice()
  .sort((a, b) => b.length - a.length)
  .join("|")

const TOKEN_RE = new RegExp(
  [
    `('(?:''|[^'])*')`,
    `("(?:""|[^"])*")`,
    `(\\$\\d+)`,
    `(\\b(?:${KEYWORD_PATTERN})\\b)`,
    `(\\d+(?:\\.\\d+)?)`,
    `([^'"\\$\\dA-Za-z_]+|[A-Za-z_][\\w$]*)`,
  ].join("|"),
  "gi",
)

export function highlightSql(sql: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  TOKEN_RE.lastIndex = 0
  while ((match = TOKEN_RE.exec(sql)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(sql.slice(lastIndex, match.index))
    }

    const [token, singleQuoted, doubleQuoted, param, keyword, number] = match
    let className: string | undefined

    if (singleQuoted) {
      className = "text-emerald-700 dark:text-emerald-400"
    } else if (doubleQuoted) {
      className = "text-amber-700 dark:text-amber-400"
    } else if (param) {
      className = "text-teal-700 dark:text-teal-400"
    } else if (keyword) {
      className = "font-semibold text-sky-700 dark:text-sky-400"
    } else if (number) {
      className = "text-orange-700 dark:text-orange-400"
    }

    nodes.push(
      className ? (
        <span key={`${match.index}-${token}`} className={className}>
          {token}
        </span>
      ) : (
        <span key={`${match.index}-${token}`}>{token}</span>
      ),
    )

    lastIndex = match.index + token.length
  }

  if (lastIndex < sql.length) {
    nodes.push(sql.slice(lastIndex))
  }

  return nodes
}

export const sqlStrategy: AttributeValueStrategy = {
  id: "sql",
  match: (value) => value.length >= 12 && SQL_START.test(value),
  render: (value) => (
    <span className="break-all whitespace-pre-wrap text-foreground">
      {highlightSql(value)}
    </span>
  ),
}

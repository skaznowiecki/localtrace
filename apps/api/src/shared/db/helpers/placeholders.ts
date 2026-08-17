export function valuePlaceholders(rowCount: number, colCount: number): string {
  const row = `(${Array.from({ length: colCount }, () => "?").join(", ")})`
  return Array.from({ length: rowCount }, () => row).join(", ")
}

export function valuePlaceholdersWithSqlTail(
  rowCount: number,
  colCount: number,
  tailSql: string,
): string {
  const marks = Array.from({ length: colCount }, () => "?").join(", ")
  const row = `(${marks}, ${tailSql})`
  return Array.from({ length: rowCount }, () => row).join(", ")
}

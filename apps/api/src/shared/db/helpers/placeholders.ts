export function valuePlaceholders(rowCount: number, colCount: number): string {
  const row = `(${Array.from({ length: colCount }, () => "?").join(", ")})`
  return Array.from({ length: rowCount }, () => row).join(", ")
}

export function nsToRfc3339(ns: bigint): string {
  const secs = ns / 1_000_000_000n
  const nanos = ns % 1_000_000_000n
  const date = new Date(Number(secs) * 1000)
  if (Number.isNaN(date.getTime())) return new Date().toISOString()
  const iso = date.toISOString()
  const pad = nanos.toString().padStart(9, "0")
  return iso.replace(/\.\d{3}Z$/, `.${pad}Z`)
}

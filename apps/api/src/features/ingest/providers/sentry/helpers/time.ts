export function unixSecondsToNs(value: unknown): bigint {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value !== ""
        ? Number(value)
        : Number.NaN
  if (!Number.isFinite(n) || n <= 0) return 0n
  return BigInt(Math.round(n * 1e9))
}

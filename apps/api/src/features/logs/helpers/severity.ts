export const SEVERITY_BUCKETS = [
  "TRACE",
  "DEBUG",
  "INFO",
  "WARN",
  "ERROR",
  "FATAL",
  "UNSPECIFIED",
] as const

export type SeverityBucket = (typeof SEVERITY_BUCKETS)[number]

/** SQL CASE that maps OTLP severity_number / severity_text to a bucket. */
export const sqlExpr = `CASE
  WHEN severity_number >= 21 THEN 'FATAL'
  WHEN severity_number >= 17 THEN 'ERROR'
  WHEN severity_number >= 13 THEN 'WARN'
  WHEN severity_number >= 9 THEN 'INFO'
  WHEN severity_number >= 5 THEN 'DEBUG'
  WHEN severity_number >= 1 THEN 'TRACE'
  WHEN upper(severity_text) IN ('FATAL', 'CRITICAL') THEN 'FATAL'
  WHEN upper(severity_text) IN ('ERROR', 'ERR') THEN 'ERROR'
  WHEN upper(severity_text) IN ('WARN', 'WARNING') THEN 'WARN'
  WHEN upper(severity_text) IN ('INFO', 'INFORMATION') THEN 'INFO'
  WHEN upper(severity_text) = 'DEBUG' THEN 'DEBUG'
  WHEN upper(severity_text) = 'TRACE' THEN 'TRACE'
  ELSE 'UNSPECIFIED'
END`

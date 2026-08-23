export type IngestProviderName = "otlp" | "sentry" | "datadog"

export function ingestProviderFromId(id: string): IngestProviderName {
  if (id === "sentry") return "sentry"
  if (id.startsWith("datadog")) return "datadog"
  return "otlp"
}

export function stampIngestProvider<T extends { ingestProvider?: IngestProviderName }>(
  records: T[],
  id: string,
): T[] {
  const ingestProvider = ingestProviderFromId(id)
  return records.map((record) => ({ ...record, ingestProvider }))
}

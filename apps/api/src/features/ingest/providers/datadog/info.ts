export function info(maxBytes: number) {
  return {
    version: "7.0.0",
    endpoints: [
      "/v0.3/traces",
      "/v0.4/traces",
      "/v0.5/traces",
      "/v0.7/traces",
      "/v0.4/services",
      "/v0.6/stats",
      "/info",
    ],
    client_drop_p0s: false,
    span_meta_structs: false,
    long_running_spans: true,
    span_events: true,
    config: { max_request_bytes: maxBytes },
  }
}

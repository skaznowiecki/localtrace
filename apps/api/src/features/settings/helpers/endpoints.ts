import type { SettingsEndpoints } from "../types/dto"

export function endpoints(
  apiPort: number,
  grpcPort: number,
): SettingsEndpoints {
  const origin = `http://127.0.0.1:${apiPort}`
  return {
    otlp: origin,
    otlpGrpc: grpcPort > 0 ? `http://127.0.0.1:${grpcPort}` : "",
    sentryDsn: `http://local@127.0.0.1:${apiPort}/1`,
    datadog: origin,
    mcp: `${origin}/mcp`,
  }
}

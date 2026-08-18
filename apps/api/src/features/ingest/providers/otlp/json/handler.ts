const CONTENT_TYPE = "application/json"

export function otlpJsonSuccess(): Response {
  return new Response("{}", {
    status: 200,
    headers: { "content-type": CONTENT_TYPE },
  })
}

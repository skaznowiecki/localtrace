const CONTENT_TYPE = "application/x-protobuf"

export function otlpProtoSuccess(): Response {
  return new Response(new Uint8Array(), {
    status: 200,
    headers: { "content-type": CONTENT_TYPE },
  })
}

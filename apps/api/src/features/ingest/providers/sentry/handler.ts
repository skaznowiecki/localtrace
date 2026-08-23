const CONTENT_TYPE = "application/json"

export function sentrySuccess(eventId?: string): Response {
  const body = eventId ? JSON.stringify({ id: eventId }) : "{}"
  return new Response(body, {
    status: 200,
    headers: { "content-type": CONTENT_TYPE },
  })
}

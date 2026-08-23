import { readAttr, readAttrHit, type Json } from "@shared/helpers"

export const URL_KEYS = ["url.full", "http.url"] as const

const HOST_KEYS = [
  "http.host",
  "url.host",
  "url.domain",
  "net.peer.name",
  "server.address",
  "net.host.name",
] as const

export function peerHost(attrs: Json): string | undefined {
  const host = readAttr(attrs, [...HOST_KEYS])
  if (host) return host.split(":")[0] || undefined

  const url = readAttr(attrs, [...URL_KEYS])
  if (!url) return undefined
  try {
    return new URL(url).hostname || undefined
  } catch {
    return undefined
  }
}

export function urlHit(attrs: Json) {
  return readAttrHit(attrs, [...URL_KEYS])
}

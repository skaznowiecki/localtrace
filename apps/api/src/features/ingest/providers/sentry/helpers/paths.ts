const ENVELOPE_PATH = /^\/api\/[^/]+\/envelope\/?$/

export function isEnvelopePath(path: string): boolean {
  return ENVELOPE_PATH.test(path)
}

export function mediaType(contentType?: string): string {
  return contentType?.split(";")[0]?.trim().toLowerCase() ?? ""
}

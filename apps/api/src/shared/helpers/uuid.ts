import * as z from "zod"

export const uuid = z.uuid()

export function isUuid(value: string): boolean {
  return uuid.safeParse(value).success
}

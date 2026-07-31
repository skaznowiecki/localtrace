import type { AttributeValueStrategy } from "../types"

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

export const urlStrategy: AttributeValueStrategy = {
  id: "url",
  match: isUrl,
  render: (value) => (
    <a
      href={value}
      target="_blank"
      rel="noreferrer noopener"
      className="break-all text-foreground underline decoration-foreground/30 underline-offset-2 hover:decoration-foreground"
    >
      {value}
    </a>
  ),
}

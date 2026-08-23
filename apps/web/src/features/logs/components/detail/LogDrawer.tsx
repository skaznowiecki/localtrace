import { useState } from "react"

import { Sheet, SheetContent } from "@/components/ui/sheet"
import { AttributeTree, isAttributeTreeEmpty } from "@/features/traces"
import { cn } from "@/lib/utils"

import { bodyToText } from "../../lib/severity"
import type { JsonValue, LogListItem } from "../../types"
import { LogDrawerHeader } from "./LogDrawerHeader"

type LogDrawerProps = {
  log: LogListItem | null
  onOpenChange: (open: boolean) => void
}

function isJsonContainer(value: JsonValue): boolean {
  return value !== null && typeof value === "object"
}

export function LogDrawer({ log, onOpenChange }: LogDrawerProps) {
  const [fullscreen, setFullscreen] = useState(false)
  const bodyText = log ? bodyToText(log.body) : ""
  const bodyIsJson = log ? isJsonContainer(log.body) : false
  const hasAttributes = log ? !isAttributeTreeEmpty(log.attributes) : false

  return (
    <Sheet
      open={log !== null}
      onOpenChange={(open) => {
        if (!open) setFullscreen(false)
        onOpenChange(open)
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "flex h-full w-full flex-col gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:max-w-none",
          fullscreen
            ? "data-[side=right]:md:w-full data-[side=right]:md:max-w-none"
            : "data-[side=right]:md:w-[52vw] data-[side=right]:md:max-w-[52vw]",
        )}
      >
        {log ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <LogDrawerHeader
              log={log}
              fullscreen={fullscreen}
              onFullscreenChange={setFullscreen}
            />

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <section className="mb-4">
                <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Message
                </p>
                {bodyIsJson ? (
                  <AttributeTree value={log.body} />
                ) : bodyText ? (
                  <pre className="font-mono text-[12px] leading-relaxed wrap-break-word whitespace-pre-wrap text-foreground">
                    {bodyText}
                  </pre>
                ) : (
                  <p className="text-[12px] text-muted-foreground italic">
                    Empty body
                  </p>
                )}
              </section>

              {log.scopeName || log.spanId ? (
                <section className="mb-4 space-y-1 text-[12px]">
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Context
                  </p>
                  {log.scopeName ? (
                    <p>
                      <span className="text-muted-foreground">Scope </span>
                      <span className="font-mono">
                        {log.scopeName}
                        {log.scopeVersion ? `@${log.scopeVersion}` : ""}
                      </span>
                    </p>
                  ) : null}
                  {log.spanId ? (
                    <p>
                      <span className="text-muted-foreground">Span </span>
                      <span className="font-mono">{log.spanId}</span>
                    </p>
                  ) : null}
                </section>
              ) : null}

              <section>
                <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Attributes
                </p>
                {hasAttributes ? (
                  <AttributeTree value={log.attributes} />
                ) : (
                  <p className="text-[12px] text-muted-foreground">
                    No attributes
                  </p>
                )}
              </section>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

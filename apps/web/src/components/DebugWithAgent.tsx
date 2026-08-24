import { BotIcon, CheckIcon } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import {
  buildDebugPrompt,
  type DebugWithAgentProps,
} from "./debug-with-agent"

export type { DebugWithAgentProps }

export function DebugWithAgent(props: DebugWithAgentProps) {
  const [copied, setCopied] = useState(false)
  const prompt = useMemo(() => buildDebugPrompt(props), [props])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore clipboard failures
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 rounded-md bg-violet-500/10 px-2.5 text-violet-700 hover:bg-violet-500/15 hover:text-violet-800"
            onClick={() => void copy()}
            aria-label="Debug with agent"
          />
        }
      >
        {copied ? (
          <CheckIcon className="size-3.5" />
        ) : (
          <BotIcon className="size-3.5" />
        )}
        {copied ? "Copied" : "Debug with agent"}
      </TooltipTrigger>
      <TooltipContent>
        {copied ? "Copied" : "Copy agent prompt"}
      </TooltipContent>
    </Tooltip>
  )
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { SettingsIcon } from "lucide-react"
import { useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  clearTelemetry,
  RETENTION_PRESETS,
  settingsQuery,
  updateSettings,
  type RetentionHours,
} from "@/lib/settings"

export function SettingsButton() {
  const [open, setOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const queryClient = useQueryClient()
  const settings = useQuery(settingsQuery())

  const retention = useMutation({
    mutationFn: updateSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(settingsQuery().queryKey, data)
    },
  })

  const clear = useMutation({
    mutationFn: clearTelemetry,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["traces"] }),
        queryClient.invalidateQueries({ queryKey: ["logs"] }),
      ])
      setConfirmOpen(false)
      setOpen(false)
    },
  })

  const retentionHours = settings.data?.retentionHours ?? 24

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Settings"
            />
          }
        >
          <SettingsIcon />
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Retention and a full wipe of local telemetry.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel>Keep data for</FieldLabel>
              <ToggleGroup
                value={[String(retentionHours)]}
                onValueChange={(value) => {
                  const next = Number(value[0])
                  if (next === 1 || next === 6 || next === 24 || next === 168) {
                    retention.mutate(next as RetentionHours)
                  }
                }}
                spacing={0}
                variant="outline"
                size="sm"
              >
                {RETENTION_PRESETS.map((preset) => (
                  <ToggleGroupItem
                    key={preset.hours}
                    value={String(preset.hours)}
                  >
                    {preset.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <FieldDescription>
                Older telemetry is deleted automatically.
              </FieldDescription>
            </Field>
          </FieldGroup>

          <Separator />

          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-sm font-medium">Clear all data</p>
              <p className="text-sm text-muted-foreground">
                Deletes stored telemetry.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setConfirmOpen(true)}
            >
              Clear
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all telemetry?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes every trace, span, log, and metric in the local
              database. It cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={clear.isPending}
              onClick={() => clear.mutate()}
            >
              Clear all data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

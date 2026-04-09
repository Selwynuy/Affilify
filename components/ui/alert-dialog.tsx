"use client"

import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"

type AlertDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  pending?: boolean
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  pending = false,
}: AlertDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      disableOverlayClose={pending}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            disabled={pending}
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white/70 hover:bg-white/10"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className={
              destructive
                ? "h-9 rounded-lg border border-red-500/20 bg-red-500/15 px-3 text-xs text-red-200 hover:bg-red-500/25"
                : "h-9 rounded-lg bg-brand-accent px-3 text-xs font-semibold text-brand-bg hover:bg-brand-accent-hover"
            }
          >
            {pending ? "Processing..." : confirmLabel}
          </Button>
        </div>
      }
    />
  )
}

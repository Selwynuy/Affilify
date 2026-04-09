"use client"

import { AlertDialog } from "@/components/ui/alert-dialog"

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
  confirmLabel?: string
  cancelLabel?: string
  pending?: boolean
  destructive?: boolean
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  return <AlertDialog {...props} />
}

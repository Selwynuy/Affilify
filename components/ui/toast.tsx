"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastVariant = "default" | "success" | "error" | "warning" | "info"

export type ToastRecord = {
  id: string
  title?: string
  description?: string
  duration?: number
  variant?: ToastVariant
}

const variantClass: Record<ToastVariant, string> = {
  default: "border-white/10 bg-[#12151a] text-white",
  success: "border-emerald-500/30 bg-emerald-500/12 text-emerald-100",
  error: "border-red-500/30 bg-red-500/12 text-red-100",
  warning: "border-amber-500/30 bg-amber-500/12 text-amber-100",
  info: "border-sky-500/30 bg-sky-500/12 text-sky-100",
}

export function ToastCard({
  toast,
  onClose,
}: {
  toast: ToastRecord
  onClose: (id: string) => void
}) {
  return (
    <div
      className={cn(
        "w-full rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-sm",
        variantClass[toast.variant ?? "default"],
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          {toast.title ? <p className="text-sm font-semibold">{toast.title}</p> : null}
          {toast.description ? (
            <p className="text-xs leading-relaxed opacity-90">{toast.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onClose(toast.id)}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

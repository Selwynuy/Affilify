"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  disableOverlayClose?: boolean
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  disableOverlayClose = false,
}: DialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!disableOverlayClose) onOpenChange(false)
      }}
      onKeyDown={(event) => {
        if (!disableOverlayClose && event.key === "Escape") onOpenChange(false)
      }}
      role="presentation"
    >
      <div
        className={cn(
          "w-full max-w-md rounded-2xl border border-white/10 bg-[#14181f] p-5 shadow-2xl",
        )}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {description ? <p className="text-xs text-white/45">{description}</p> : null}
        </div>
        {children ? <div className="mt-4">{children}</div> : null}
        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </div>
  )
}

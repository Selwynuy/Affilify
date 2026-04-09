"use client"

import * as React from "react"
import { toast } from "@/components/ui/use-toast"

type NotifyInput = {
  title?: string
  description: string
  duration?: number
}

export function useNotify() {
  return React.useMemo(
    () => ({
      success: ({ title = "Success", description, duration }: NotifyInput) =>
        toast({ title, description, duration, variant: "success" }),
      error: ({ title = "Something went wrong", description, duration }: NotifyInput) =>
        toast({ title, description, duration, variant: "error" }),
      warning: ({ title = "Attention", description, duration }: NotifyInput) =>
        toast({ title, description, duration, variant: "warning" }),
      info: ({ title = "Notice", description, duration }: NotifyInput) =>
        toast({ title, description, duration, variant: "info" }),
    }),
    [],
  )
}

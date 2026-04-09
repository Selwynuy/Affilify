"use client"

import * as React from "react"
import type { ToastRecord, ToastVariant } from "@/components/ui/toast"

type ToastInput = {
  title?: string
  description?: string
  duration?: number
  variant?: ToastVariant
}

type ToastState = {
  toasts: ToastRecord[]
}

const listeners = new Set<(state: ToastState) => void>()
let memoryState: ToastState = { toasts: [] }

function emit(state: ToastState) {
  memoryState = state
  listeners.forEach((listener) => listener(memoryState))
}

function dismiss(id: string) {
  emit({
    toasts: memoryState.toasts.filter((toast) => toast.id !== id),
  })
}

function addToast(input: ToastInput) {
  const id = crypto.randomUUID()
  const next: ToastRecord = {
    id,
    title: input.title,
    description: input.description,
    duration: input.duration ?? 4000,
    variant: input.variant ?? "default",
  }

  emit({
    toasts: [next, ...memoryState.toasts].slice(0, 5),
  })

  const timeout = next.duration ?? 0
  if (timeout > 0) {
    window.setTimeout(() => dismiss(id), timeout)
  }

  return {
    id,
    dismiss: () => dismiss(id),
  }
}

export function toast(input: ToastInput) {
  return addToast(input)
}

export function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState)

  React.useEffect(() => {
    listeners.add(setState)
    return () => {
      listeners.delete(setState)
    }
  }, [])

  return {
    ...state,
    toast: addToast,
    dismiss,
  }
}

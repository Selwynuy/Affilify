"use client"

import { ToastCard } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] mx-auto flex max-w-[560px] flex-col gap-2 p-3 sm:p-4">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastCard toast={toast} onClose={dismiss} />
        </div>
      ))}
    </div>
  )
}

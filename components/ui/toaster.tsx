"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastViewport,
} from "@/components/ui/toast"
import { type ToastProps, type ToastActionElement } from "@/components/ui/toast"

export function Toaster() {
  const { toast, hideToast } = useToast()

  return (
    <ToastProvider swipeDirection="right">
      {toast.open && (
        <Toast
          open={toast.open}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              hideToast()
            }
          }}
          duration={toast.duration}
        >
          <div className="grid gap-1">
            {toast.message && (
              <ToastDescription>{toast.message}</ToastDescription>
            )}
          </div>
          <ToastClose />
        </Toast>
      )}
      <ToastViewport />
    </ToastProvider>
  )
}

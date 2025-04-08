"use client"

import { Check } from "lucide-react"
import { Toast, ToastProvider, ToastViewport } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

export function ToastNotification() {
  const { toast, hideToast } = useToast()

  if (!toast.open) return null

  return (
    <ToastProvider>
      <Toast
        variant="success"
        open={toast.open}
        onOpenChange={hideToast}
        className="fixed bottom-4 right-4 flex items-center gap-2"
      >
        <div className="flex items-center gap-2">
          <div className="bg-green-100 rounded-full p-1">
            <Check className="h-4 w-4 text-green-600" />
          </div>
          <span>{toast.message}</span>
        </div>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  )
}

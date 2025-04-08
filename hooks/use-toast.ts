"use client"

import { useState, useEffect } from "react"

type ToastType = "success" | "error" | "info"

interface ToastState {
  open: boolean
  message: string
  type: ToastType
  duration?: number
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    type: "info",
    duration: 5000,
  })

  useEffect(() => {
    if (toast.open) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, open: false }))
      }, toast.duration)

      return () => clearTimeout(timer)
    }
  }, [toast.open, toast.duration])

  const showToast = (message: string, type: ToastType = "info", duration = 5000) => {
    setToast({
      open: true,
      message,
      type,
      duration,
    })
  }

  const hideToast = () => {
    setToast((prev) => ({ ...prev, open: false }))
  }

  return {
    toast,
    showToast,
    hideToast,
  }
}

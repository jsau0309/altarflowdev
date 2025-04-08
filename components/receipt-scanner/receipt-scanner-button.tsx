"use client"

import type React from "react"

import { useState } from "react"
import { Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ReceiptScannerModal } from "./receipt-scanner-modal"

interface ReceiptScannerButtonProps {
  onDataCaptured: (data: any) => void
  children?: React.ReactNode
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

export function ReceiptScannerButton({
  onDataCaptured,
  children,
  variant = "default",
  size = "default",
}: ReceiptScannerButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleDataCaptured = (data: any) => {
    onDataCaptured(data)
    setIsModalOpen(false)
  }

  return (
    <>
      <Button type="button" onClick={() => setIsModalOpen(true)} variant={variant} size={size} className="gap-2">
        <Camera className="h-4 w-4" />
        {children || "Scan Receipt"}
      </Button>

      <ReceiptScannerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDataCaptured={handleDataCaptured}
      />
    </>
  )
}

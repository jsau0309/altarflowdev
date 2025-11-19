"use client"

import type React from "react"

import { useState } from "react"
import { Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ReceiptScannerModal } from "./receipt-scanner-modal"
import { useTranslation } from "react-i18next"

interface ReceiptScannerButtonProps {
  onDataCaptured: (data: unknown) => void
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
  const { t } = useTranslation()

  const handleDataCaptured = (data: unknown) => {
    onDataCaptured(data)
    setIsModalOpen(false)
  }

  return (
    <>
      <Button type="button" onClick={() => setIsModalOpen(true)} variant={variant} size={size} className="gap-2">
        <Camera className="h-4 w-4" />
        {children || t('receiptScanner.scanReceipt')}
      </Button>

      <ReceiptScannerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDataCaptured={handleDataCaptured}
      />
    </>
  )
}

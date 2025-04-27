"use client"

import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

export function ProcessingView() {
  const { t } = useTranslation('receiptScanner')
  return (
    <div className="flex flex-col items-center justify-center p-12">
      <div className="relative mb-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-4 rounded-full bg-primary"></div>
        </div>
      </div>
      <h3 className="text-lg font-medium mb-2">{t('processing.title')}</h3>
      <div className="space-y-1 text-center">
        <p className="text-sm text-muted-foreground">{t('processing.extracting')}</p>
        <p className="text-xs text-muted-foreground">{t('processing.wait')}</p>
      </div>
    </div>
  )
}

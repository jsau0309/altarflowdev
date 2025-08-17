"use client"

import type React from "react"

import { useState } from "react"
import { Camera, Upload } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { MobileScanView } from "./mobile-scan-view"
import { ProcessingView } from "./processing-view"
import { ReviewDataView } from "./review-data-view"
import { useTranslation } from "react-i18next"

interface ReceiptScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onDataCaptured: (data: any) => void
}

type ScanningStage = "initial" | "camera" | "upload" | "processing" | "review"

export function ReceiptScannerModal({ isOpen, onClose, onDataCaptured }: ReceiptScannerModalProps) {
  const { t } = useTranslation('receiptScanner')
  const [scanningStage, setScanningStage] = useState<ScanningStage>("initial")
  const [receiptImage, setReceiptImage] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const callScanApi = async (fileSource: File | string) => {
    setError(null)
    setIsProcessing(true)
    setScanningStage("processing")

    try {
      const formData = new FormData()
      if (fileSource instanceof File) {
        formData.append('receipt', fileSource)
      } else if (typeof fileSource === 'string') {
        const fetchRes = await fetch(fileSource)
        const blob = await fetchRes.blob()
        const fileName = `camera_capture_${Date.now()}.jpg`
        formData.append('receipt', blob, fileName)
      } else {
        throw new Error("Invalid file source type")
      }

      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `API Error: ${response.statusText}`)
      }

      const apiData = result.extractedData || result.data || {}
      setExtractedData({
        vendor: apiData.vendor,
        total: apiData.total,
        date: apiData.date,
        description: "",
        items: apiData.items || [],
        receiptUrl: result.receiptUrl || null,
        receiptPath: result.receiptPath || null,
        receiptImage: typeof fileSource === 'string' ? fileSource : receiptImage
      })
      if (result.receiptUrl) {
        setReceiptImage(result.receiptUrl);
      }
      setScanningStage("review")
    } catch (err) {
      console.error("Receipt processing error:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred during scanning.")
      setScanningStage("initial")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const readerTarget = event.target as FileReader | null;
        if (readerTarget && readerTarget.result) {
          setReceiptImage(readerTarget.result as string)
        }
      }
      reader.readAsDataURL(file)
      
      callScanApi(file)
    }
    e.target.value = ''
  }

  const handleCameraCapture = (imageData: string) => {
    setReceiptImage(imageData)
    callScanApi(imageData)
  }

  const handleAcceptData = () => {
    onDataCaptured(extractedData)
  }

  const resetModal = () => {
    setScanningStage("initial")
    setReceiptImage(null)
    setExtractedData(null)
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-[500px] p-0 overflow-hidden">
        {scanningStage === "initial" && (
          <>
            <DialogHeader className="p-4 border-b">
              <DialogTitle>{t('modal.title')}</DialogTitle>
              {/* You can add a DialogDescription here if needed: <DialogDescription>Your description</DialogDescription> */}
            </DialogHeader>

            <Tabs defaultValue="scan" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-none">
                <TabsTrigger value="scan" className="rounded-none py-3">
                  <Camera className="mr-2 h-4 w-4" />
                  {t('modal.scanTab')}
                </TabsTrigger>
                <TabsTrigger value="upload" className="rounded-none py-3">
                  <Upload className="mr-2 h-4 w-4" />
                  {t('modal.uploadTab')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scan" className="p-0">
                <div className="flex flex-col items-center justify-center p-8 bg-muted/20">
                  <div className="rounded-full bg-primary/10 p-6 mb-4">
                    <Camera className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">{t('modal.scanTitle')}</h3>
                  <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
                    {t('modal.scanDescription')}
                  </p>
                  <Button onClick={() => setScanningStage("camera")} size="lg">
                    {t('modal.startCameraButton')}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="p-0">
                <div className="flex flex-col items-center justify-center p-8 bg-muted/20">
                  <div className="rounded-full bg-primary/10 p-6 mb-4">
                    <Upload className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">{t('modal.uploadTitle')}</h3>
                  <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
                    {t('modal.uploadDescription')}
                  </p>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    id="receipt-file-upload"
                    onChange={handleFileUpload}
                  />
                  <Button onClick={() => document.getElementById("receipt-file-upload")?.click()} size="lg">
                    {t('modal.selectFileButton')}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}

        {scanningStage === "camera" && (
          <MobileScanView onCapture={handleCameraCapture} onCancel={() => setScanningStage("initial")} />
        )}

        {scanningStage === "processing" && <ProcessingView />}

        {scanningStage === "review" && extractedData && (
          <ReviewDataView
            data={extractedData}
            receiptImage={receiptImage}
            onAccept={handleAcceptData}
            onCancel={() => setScanningStage("initial")}
            onEdit={(updatedData) => setExtractedData(updatedData)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

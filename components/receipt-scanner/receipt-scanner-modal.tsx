"use client"
import { logger } from '@/lib/logger';

import type React from "react"

import { useState, useEffect } from "react"
import { Camera, Upload, X } from "lucide-react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { MobileScanView } from "./mobile-scan-view"
import { ProcessingView, type ProcessingStageKey } from "./processing-view"
import { ReviewDataView, type ReviewData } from "./review-data-view"
import { useTranslation } from "react-i18next"

interface ReceiptScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onDataCaptured: (data: unknown) => void
}

type ScanningStage = "initial" | "camera" | "upload" | "preview" | "processing" | "review"

export function ReceiptScannerModal({ isOpen, onClose, onDataCaptured }: ReceiptScannerModalProps) {
  const { t } = useTranslation('receiptScanner')
  const [scanningStage, setScanningStage] = useState<ScanningStage>("initial")
  const [receiptImage, setReceiptImage] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<ReviewData | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [receiptMetadata, setReceiptMetadata] = useState<Record<string, unknown> | null>(null)
  const [processingStage, setProcessingStage] = useState<ProcessingStageKey>('uploading')

  // Cleanup blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (receiptImage?.startsWith('blob:')) {
        URL.revokeObjectURL(receiptImage)
      }
      if (capturedImage?.startsWith('blob:')) {
        URL.revokeObjectURL(capturedImage)
      }
    }
  }, [receiptImage, capturedImage])

  const callScanApi = async (fileSource: File | string) => {
    setScanningStage("processing")

    try {
      setProcessingStage('uploading')
      const formData = new FormData()
      let preparedFile: File

      setReceiptMetadata(null)

      if (fileSource instanceof File) {
        preparedFile = fileSource
      } else if (typeof fileSource === 'string') {
        const fetchRes = await fetch(fileSource)
        const blob = await fetchRes.blob()
        const fileName = `camera_capture_${Date.now()}.jpg`
        preparedFile = new File([blob], fileName, { type: blob.type || 'image/jpeg' })
        setReceiptImage(fileSource)
      } else {
        throw new Error("Invalid file source type")
      }

      formData.append('receipt', preparedFile)
      setPendingFile(preparedFile)

      const requestPromise = fetch('/api/scan-receipt', {
        method: 'POST',
        body: formData,
      })
      setProcessingStage('analyzing')

      const response = await requestPromise

      setProcessingStage('extracting')
      const result = await response.json()
      await new Promise(resolve => setTimeout(resolve, 180))

      if (!response.ok) {
        throw new Error(result.error || `API Error: ${response.statusText}`)
      }

      const apiData = result.extractedData || result.data || {}
      setReceiptMetadata(result.metadata ?? null)

      let previewImage: string | null
      if (typeof fileSource === 'string') {
        previewImage = fileSource
      } else if (receiptImage) {
        previewImage = receiptImage
      } else {
        previewImage = URL.createObjectURL(preparedFile)
      }

      setExtractedData({
        vendor: apiData.vendor ?? "",
        total: apiData.total != null ? String(apiData.total) : "",
        date: apiData.date ?? "",
        description: "",
        items: apiData.items || [],
        receiptUrl: null,
        receiptImage: previewImage,
        confidence: apiData.confidence
      })
      if (previewImage) {
        setReceiptImage(previewImage)
      }
      setCapturedImage(null)
      setScanningStage("review")
    } catch (err) {
      logger.error("Receipt processing error", { operation: "ui.receipt.processing_error" }, err instanceof Error ? err : new Error(String(err)))
      setCapturedImage(null)
      setPendingFile(null)
      setReceiptMetadata(null)
      setProcessingStage('uploading')
      setScanningStage("initial")
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
    setCapturedImage(imageData)
    setScanningStage("preview")
  }

  const handleAcceptData = (updatedData: any) => {
    onDataCaptured({
      ...updatedData,
      receiptFile: pendingFile ?? null,
      receiptMetadata,
    })
  }

  const handleRescan = () => {
    setExtractedData(null)
    setReceiptImage(null)
    setCapturedImage(null)
    setPendingFile(null)
    setReceiptMetadata(null)
    setProcessingStage('uploading')
    setScanningStage("camera")
  }

  const resetModal = () => {
    setScanningStage("initial")
    setReceiptImage(null)
    setExtractedData(null)
    setCapturedImage(null)
    setPendingFile(null)
    setReceiptMetadata(null)
    setProcessingStage('uploading')
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  const isCaptureStage = scanningStage === "camera" || scanningStage === "preview"

  const handleUsePhoto = () => {
    if (capturedImage) {
      setReceiptImage(capturedImage)
      callScanApi(capturedImage)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose} modal>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        {!isCaptureStage && (
          <div className="fixed left-[50%] top-[50%] z-[59] w-full sm:w-[500px] max-w-full translate-x-[-50%] translate-y-[-50%] pointer-events-none">
            <div className="absolute -top-8 left-0 right-0 h-16 bg-black/80 backdrop-blur-xl" />
            <div className="absolute -bottom-8 left-0 right-0 h-16 bg-black/80 backdrop-blur-xl" />
          </div>
        )}

        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={`fixed left-[50%] top-[50%] z-[60] flex translate-x-[-50%] translate-y-[-50%] shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] ${isCaptureStage ? "h-screen w-screen max-w-none flex-col bg-black p-0 sm:rounded-none" : "w-full h-full sm:w-[500px] sm:h-auto max-h-[calc(100vh-4rem)] flex-col bg-background p-0 sm:p-6 sm:rounded-xl"}`}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          {!isCaptureStage && (
            <DialogPrimitive.Close className="absolute right-4 sm:right-4 top-4 sm:top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        {scanningStage === "initial" && (
          <div className="flex flex-1 flex-col overflow-hidden sm:-m-6">
            <DialogHeader className="border-b px-6 py-5 sm:px-6 sm:py-5">
              <DialogTitle>{t('modal.title')}</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 pb-6 pt-5 sm:px-6 sm:pb-6 sm:pt-5">
              <Tabs defaultValue="scan" className="w-full sm:hidden">
                <TabsList className="flex w-full rounded-full border border-border bg-muted/70 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(15,23,42,0.12)]">
                  <TabsTrigger
                    value="scan"
                    className="flex-1 rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    {t('modal.scanTab')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="upload"
                    className="flex-1 rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {t('modal.uploadTab')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="scan" className="p-0 pt-5">
                  <div className="flex min-h-[280px] flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-muted-foreground/25 bg-muted/15 px-10 py-10 text-center shadow-inner">
                    <div className="rounded-full bg-primary/10 p-5">
                      <Camera className="h-10 w-10 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">{t('modal.scanTitle')}</h3>
                      <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                        {t('modal.scanDescription')}
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setCapturedImage(null)
                        setScanningStage("camera")
                      }}
                      size="lg"
                      className="px-8"
                    >
                      {t('modal.startCameraButton')}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="upload" className="p-0 pt-5">
                  <div className="flex min-h-[280px] flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-muted-foreground/25 bg-muted/15 px-10 py-10 text-center shadow-inner">
                    <div className="rounded-full bg-primary/10 p-5">
                      <Upload className="h-10 w-10 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">{t('modal.uploadTitle')}</h3>
                      <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                        {t('modal.uploadDescription')}
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      id="receipt-file-upload"
                      onChange={handleFileUpload}
                    />
                    <Button
                      onClick={() => document.getElementById("receipt-file-upload")?.click()}
                      size="lg"
                      className="px-8"
                    >
                      {t('modal.selectFileButton')}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Desktop: Upload only */}
              <div className="hidden sm:block w-full">
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-muted-foreground/25 bg-muted/15 px-10 py-10 text-center shadow-inner">
                  <div className="rounded-full bg-primary/10 p-5">
                    <Upload className="h-10 w-10 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">{t('modal.uploadTitle')}</h3>
                    <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                      {t('modal.uploadDescription')}
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    id="receipt-file-upload-desktop"
                    onChange={handleFileUpload}
                  />
                  <Button
                    onClick={() => document.getElementById("receipt-file-upload-desktop")?.click()}
                    size="lg"
                    className="px-8"
                  >
                    {t('modal.selectFileButton')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {scanningStage === "camera" && (
          <MobileScanView
            onCapture={handleCameraCapture}
            onCancel={() => {
              setCapturedImage(null)
              setScanningStage("initial")
            }}
          />
        )}

        {scanningStage === "preview" && capturedImage && (
          <div className="relative flex h-full w-full flex-col bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={capturedImage} alt={t('modal.scanTitle')} className="h-full w-full object-contain" />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 pt-6">
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/70"
                onClick={() => setScanningStage("camera")}
              >
                <Camera className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/70"
                onClick={() => {
                  setCapturedImage(null)
                  setScanningStage("initial")
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-6 pb-10 pt-12">
              <div className="flex w-full gap-3">
                <Button
                  variant="outline"
                  className="flex-1 bg-white/85 text-foreground hover:bg-white"
                  onClick={() => {
                    setCapturedImage(null)
                    setScanningStage("camera")
                  }}
                >
                  {t('review.rescanButton')}
                </Button>
                <Button className="flex-1" onClick={handleUsePhoto}>
                  {t('modal.usePhotoButton')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {scanningStage === "processing" && <ProcessingView stage={processingStage} />}

        {scanningStage === "review" && extractedData && (
          <ReviewDataView
            data={extractedData}
            onAccept={handleAcceptData}
            onCancel={() => setScanningStage("initial")}
            onRescan={handleRescan}
          />
        )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  )
}

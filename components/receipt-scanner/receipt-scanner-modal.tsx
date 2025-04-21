"use client"

import type React from "react"

import { useState } from "react"
import { Camera, Upload } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
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
  const { t } = useTranslation()
  const [scanningStage, setScanningStage] = useState<ScanningStage>("initial")
  const [receiptImage, setReceiptImage] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<any>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const readerTarget = event.target as FileReader | null;
        if (readerTarget && readerTarget.result) {
          setReceiptImage(readerTarget.result as string)
          setScanningStage("processing")

          // Simulate processing delay
          setTimeout(() => {
            // Mock extracted data
            setExtractedData({
              vendor: "Office Depot",
              total: "125.47",
              date: new Date().toISOString().split("T")[0],
              description: "Office supplies - printer paper, ink cartridges, pens",
              items: [
                { description: "Printer Paper", amount: "45.99" },
                { description: "Ink Cartridges", amount: "65.49" },
                { description: "Pens (12 pack)", amount: "13.99" },
              ],
              taxAmount: "10.99",
              receiptImage: readerTarget.result,
            })
            setScanningStage("review")
          }, 2000)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCameraCapture = (imageData: string) => {
    setReceiptImage(imageData)
    setScanningStage("processing")

    // Simulate processing delay
    setTimeout(() => {
      // Mock extracted data
      setExtractedData({
        vendor: "Office Depot",
        total: "125.47",
        date: new Date().toISOString().split("T")[0],
        description: "Office supplies - printer paper, ink cartridges, pens",
        items: [
          { description: "Printer Paper", amount: "45.99" },
          { description: "Ink Cartridges", amount: "65.49" },
          { description: "Pens (12 pack)", amount: "13.99" },
        ],
        taxAmount: "10.99",
        receiptImage: imageData,
      })
      setScanningStage("review")
    }, 2000)
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
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        {scanningStage === "initial" && (
          <>
            <div className="flex items-center justify-center border-b p-4">
              <h2 className="text-lg font-semibold">{t('receiptScanner.modal.title')}</h2>
            </div>

            <Tabs defaultValue="scan" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-none">
                <TabsTrigger value="scan" className="rounded-none py-3">
                  <Camera className="mr-2 h-4 w-4" />
                  {t('receiptScanner.modal.scanTab')}
                </TabsTrigger>
                <TabsTrigger value="upload" className="rounded-none py-3">
                  <Upload className="mr-2 h-4 w-4" />
                  {t('receiptScanner.modal.uploadTab')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scan" className="p-0">
                <div className="flex flex-col items-center justify-center p-8 bg-muted/20">
                  <div className="rounded-full bg-primary/10 p-6 mb-4">
                    <Camera className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">{t('receiptScanner.modal.scanTitle')}</h3>
                  <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
                    {t('receiptScanner.modal.scanDescription')}
                  </p>
                  <Button onClick={() => setScanningStage("camera")} size="lg">
                    {t('receiptScanner.modal.startCameraButton')}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="p-0">
                <div className="flex flex-col items-center justify-center p-8 bg-muted/20">
                  <div className="rounded-full bg-primary/10 p-6 mb-4">
                    <Upload className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">{t('receiptScanner.modal.uploadTitle')}</h3>
                  <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
                    {t('receiptScanner.modal.uploadDescription')}
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="receipt-file-upload"
                    onChange={handleFileUpload}
                  />
                  <Button onClick={() => document.getElementById("receipt-file-upload")?.click()} size="lg">
                    {t('receiptScanner.modal.selectFileButton')}
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

"use client"

import { useState } from "react"
import { Camera, Upload, X, Loader2, Check, Edit, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "react-i18next"

// This is a mockup component to show the UI design for the receipt scanning feature
// TODO: Add props or context for real data interaction if this becomes a functional component
export function ExpenseModalWithScanner(/* props: Record<string, never> */) {
  const { t } = useTranslation()
  // States to simulate the different stages of the receipt scanning process
  const [scanningStage, setScanningStage] = useState<"initial" | "camera" | "processing" | "review" | "completed">(
    "initial",
  )

  // Mock data for the extracted receipt information
  const [extractedData, setExtractedData] = useState({
    vendor: "Office Depot",
    amount: "125.47",
    date: "2025-03-24",
    items: [
      { description: "Printer Paper", amount: "45.99" },
      { description: "Ink Cartridges", amount: "65.49" },
      { description: "Pens (12pk)", amount: "13.99" },
    ],
    total: "125.47",
    taxAmount: "10.47",
  })

  // Function to simulate starting the scanning process
  const startScanning = () => {
    setScanningStage("camera")
  }

  // Function to simulate capturing an image
  const captureImage = () => {
    setScanningStage("processing")
    // Simulate processing delay
    setTimeout(() => {
      setScanningStage("review")
    }, 2000)
  }

  // Function to simulate accepting the scanned data
  const acceptScannedData = () => {
    setScanningStage("completed")
  }

  // Function to go back to the initial state
  const resetScanner = () => {
    setScanningStage("initial")
  }

  return (
    <div className="p-6 border rounded-lg max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">{t('receiptScanner.autoFilled.newExpense')}</h2>

      {/* Initial Receipt Upload Options */}
      {scanningStage === "initial" && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>{t('receiptScanner.modal.title')}</Label>
            <Tabs defaultValue="scan" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="scan" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  <span>{t('receiptScanner.modal.scanTab')}</span>
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  <span>{t('receiptScanner.modal.uploadTab')}</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scan" className="pt-4">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-primary/20 rounded-md p-8 bg-primary/5">
                  <Camera className="h-12 w-12 text-primary mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('receiptScanner.modal.scanTitle')}</h3>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    {t('receiptScanner.modal.scanDescription')}
                  </p>
                  <Button onClick={startScanning} className="gap-2">
                    <Camera className="h-4 w-4" />
                    {t('receiptScanner.modal.startCameraButton')}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="pt-4">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-8">
                  <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-500 mb-4 text-center">
                    {t('receiptScanner.expenseModal.dragDrop')}
                  </p>
                  <Button variant="outline">{t('receiptScanner.modal.selectFileButton')}</Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">{t('receiptScanner.autoFilled.amountLabel')}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{t('receiptScanner.autoFilled.currencySymbol')}</span>
                  <Input id="amount" type="number" placeholder="0.00" className="pl-8" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">{t('receiptScanner.autoFilled.dateLabel')}</Label>
                <Input id="date" type="date" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor">{t('receiptScanner.autoFilled.vendorLabel')}</Label>
              <Input id="vendor" placeholder={t('receiptScanner.expenseModal.vendorPlaceholder')} />
            </div>

            {/* Other form fields would go here */}
          </div>
        </div>
      )}

      {/* Camera Interface */}
      {scanningStage === "camera" && (
        <div className="space-y-6">
          <div className="relative">
            <div className="aspect-[4/5] bg-black rounded-lg overflow-hidden flex items-center justify-center">
              {/* This would be a camera view in the actual implementation */}
              <div className="absolute inset-0 border-2 border-white/50 m-8 rounded-md"></div>
              <div className="text-white text-center">{t('receiptScanner.expenseModal.cameraPreview')}</div>

              {/* Receipt framing guidelines */}
              <div className="absolute inset-x-0 top-4 text-center">
                <Badge variant="secondary" className="bg-black/70 text-white">
                  {t('receiptScanner.mobile.centerInFrame')}
                </Badge>
              </div>
            </div>

            <div className="absolute bottom-4 inset-x-0 flex justify-center gap-4">
              <Button variant="outline" size="icon" className="rounded-full bg-white" onClick={resetScanner}>
                <X className="h-6 w-6" />
              </Button>
              <Button size="icon" className="rounded-full h-14 w-14" onClick={captureImage}>
                <div className="h-10 w-10 rounded-full border-2 border-white"></div>
              </Button>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>{t('receiptScanner.mobile.ensureLighting')}</p>
          </div>
        </div>
      )}

      {/* Processing State */}
      {scanningStage === "processing" && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative mb-6">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-4 w-4 rounded-full bg-primary"></div>
            </div>
          </div>
          <h3 className="text-lg font-medium mb-2">{t('receiptScanner.processing.title')}</h3>
          <div className="space-y-1 text-center">
            <p className="text-sm text-muted-foreground">{t('receiptScanner.processing.extracting')}</p>
            <p className="text-xs text-muted-foreground">{t('receiptScanner.processing.wait')}</p>
          </div>
        </div>
      )}

      {/* Review Extracted Data */}
      {scanningStage === "review" && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md">
            <Check className="h-5 w-5" />
            <span className="font-medium">{t('receiptScanner.review.success')}</span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium mb-2">{t('receiptScanner.autoFilled.receiptImageLabel')}</h3>
              <div className="border rounded-md overflow-hidden bg-gray-50">
                {/* This would be the actual receipt image */}
                <div className="aspect-[3/4] flex items-center justify-center text-gray-400">{t('receiptScanner.expenseModal.receiptImagePreview')}</div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">{t('receiptScanner.expenseModal.extractedInfo')}</h3>
                <Button variant="ghost" size="sm" className="h-8 gap-1">
                  <Edit className="h-3.5 w-3.5" />
                  <span className="text-xs">{t('receiptScanner.expenseModal.editButton')}</span>
                </Button>
              </div>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{t('receiptScanner.review.vendor')}</p>
                      <p className="font-medium">{extractedData.vendor}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('receiptScanner.review.date')}</p>
                      <p className="font-medium">{new Date(extractedData.date).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('receiptScanner.review.items')}</p>
                    <div className="space-y-1.5">
                      {extractedData.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.description}</span>
                          <span>{t('receiptScanner.review.currencySymbol')}{item.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-2">
                    <div className="flex justify-between text-sm">
                      <span>{t('receiptScanner.review.tax')}</span>
                      <span>{t('receiptScanner.review.currencySymbol')}{extractedData.taxAmount}</span>
                    </div>
                    <div className="flex justify-between font-medium mt-1">
                      <span>{t('receiptScanner.review.total')}</span>
                      <span>{t('receiptScanner.review.currencySymbol')}{extractedData.total}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={resetScanner}>
              {t('receiptScanner.autoFilled.cancelButton')}
            </Button>
            <Button onClick={acceptScannedData}>{t('receiptScanner.review.useDataButton')}</Button>
          </div>
        </div>
      )}

      {/* Form with Auto-Populated Fields */}
      {scanningStage === "completed" && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md">
            <Check className="h-5 w-5" />
            <span className="font-medium">Receipt data applied to form</span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">{t('receiptScanner.autoFilled.amountLabel')}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{t('receiptScanner.autoFilled.currencySymbol')}</span>
                  <Input
                    id="amount"
                    type="number"
                    value={extractedData.total}
                    className="pl-8 border-green-500 bg-green-50/50"
                  />
                  <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-100 text-green-800 text-xs">
                    Auto-filled
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <div className="relative">
                  <Input id="date" type="date" value={extractedData.date} className="border-green-500 bg-green-50/50" />
                  <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-100 text-green-800 text-xs">
                    Auto-filled
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor">{t('receiptScanner.autoFilled.vendorLabel')}</Label>
              <div className="relative">
                <Input id="vendor" value={extractedData.vendor} className="border-green-500 bg-green-50/50" />
                <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-100 text-green-800 text-xs">
                  Auto-filled
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">{t('receiptScanner.autoFilled.categoryLabel')}</Label>
              <Input id="category" placeholder={t('receiptScanner.autoFilled.selectCategory')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-method">{t('receiptScanner.autoFilled.paymentMethodLabel')}</Label>
              <Input id="payment-method" placeholder={t('receiptScanner.autoFilled.selectPaymentMethod')} />
            </div>

            <div className="space-y-2">
              <Label>{t('receiptScanner.autoFilled.receiptImageLabel')}</Label>
              <div className="border rounded-md p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Receipt_Office_Depot.jpg</p>
                    <p className="text-xs text-muted-foreground">{t('receiptScanner.autoFilled.scannedOn', { date: 'Mar 24, 2025' })}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8">
                  {t('receiptScanner.autoFilled.viewButton')}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline">Cancel</Button>
            <Button>Save Expense</Button>
          </div>
        </div>
      )}
    </div>
  )
}

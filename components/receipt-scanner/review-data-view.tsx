"use client"

import type React from "react"

import { useState } from "react"
import { Check, Edit2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslation } from "react-i18next"

interface ReviewDataViewProps {
  data: {
    vendor: string
    total: string
    date: string
    description: string
    items?: Array<{ description: string; amount: string }>
    taxAmount?: string
    receiptImage?: string
  }
  receiptImage: string | null
  onAccept: () => void
  onCancel: () => void
  onEdit: (updatedData: any) => void
}

export function ReviewDataView({ data, receiptImage, onAccept, onCancel, onEdit }: ReviewDataViewProps) {
  const { t } = useTranslation('receiptScanner')
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState(data)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditedData((prev) => ({ ...prev, [name]: value }))
  }

  const saveChanges = () => {
    onEdit(editedData)
    setIsEditing(false)
  }

  return (
    <div className="flex flex-col max-h-[80vh]">
      <div className="flex items-center justify-center border-b p-4">
        <h2 className="text-lg font-semibold">{t('receiptScanner:review.title')}</h2>
      </div>

      <div className="overflow-y-auto p-4 space-y-4">
        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md">
          <Check className="h-5 w-5" />
          <span className="font-medium">{t('receiptScanner:review.success')}</span>
        </div>

        {receiptImage && (
          <div className="border rounded-md overflow-hidden">
            <img
              src={receiptImage || "/placeholder.svg"}
              alt="Receipt"
              className="w-full h-auto max-h-40 object-contain"
            />
          </div>
        )}

        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendor">{t('receiptScanner:review.vendor')}</Label>
                <Input id="vendor" name="vendor" value={editedData.vendor} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">{t('receiptScanner:review.date')}</Label>
                <Input id="date" name="date" type="date" value={editedData.date} onChange={handleInputChange} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="total">{t('receiptScanner:review.totalAmount')}</Label>
              <Input id="total" name="total" value={editedData.total} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('receiptScanner:review.description')}</Label>
              <Input id="description" name="description" value={editedData.description} onChange={handleInputChange} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                {t('receiptScanner:review.cancelButton')}
              </Button>
              <Button onClick={saveChanges}>{t('receiptScanner:review.saveChangesButton')}</Button>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="grid grid-cols-2 gap-3 flex-1">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('receiptScanner:review.vendor')}</p>
                    <p className="font-medium">{data.vendor}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('receiptScanner:review.date')}</p>
                    <p className="font-medium">{new Date(data.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>

              {data.items && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('receiptScanner:review.items')}</p>
                  <div className="space-y-1.5">
                    {data.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.description}</span>
                        <span>{t('receiptScanner:review.currencySymbol')}{item.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-2">
                {data.taxAmount && (
                  <div className="flex justify-between text-sm">
                    <span>{t('receiptScanner:review.tax')}</span>
                    <span>{t('receiptScanner:review.currencySymbol')}{data.taxAmount}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium mt-1">
                  <span>{t('receiptScanner:review.total')}</span>
                  <span>{t('receiptScanner:review.currencySymbol')}{data.total}</span>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('receiptScanner:review.description')}</p>
                <p className="text-sm">{data.description}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="border-t p-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          {t('receiptScanner:review.cancelButton')}
        </Button>
        <Button onClick={onAccept}>{t('receiptScanner:review.useDataButton')}</Button>
      </div>
    </div>
  )
}

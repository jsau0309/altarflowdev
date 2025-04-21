"use client"

import { DialogFooter } from "@/components/ui/dialog"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Receipt } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ReceiptScannerButton } from "@/components/receipt-scanner/receipt-scanner-button"
import { useTranslation } from "react-i18next"

interface Expense {
  id: string
  amount: number
  date: string
  vendor: string
  category: string
  paymentMethod: string
  notes: string
  receiptUrl?: string | null
}

interface NewExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  expenseToEdit?: Expense
}

export function NewExpenseModal({ isOpen, onClose, expenseToEdit }: NewExpenseModalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [receiptImage, setReceiptImage] = useState<string | null>(expenseToEdit?.receiptUrl || null)
  const [formData, setFormData] = useState({
    amount: expenseToEdit?.amount.toString() || "",
    date: expenseToEdit?.date || new Date().toISOString().split("T")[0],
    vendor: expenseToEdit?.vendor || "",
    category: expenseToEdit?.category || "",
    paymentMethod: expenseToEdit?.paymentMethod || "",
    notes: expenseToEdit?.notes || "",
  })
  const { t } = useTranslation('expenses');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (id: string, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      onClose()
      router.push("/expenses")
    }, 1500)
  }

  const handleReceiptData = (data: unknown) => {
    if (typeof data === 'object' && data !== null) {
      const expenseData = data as Partial<{ total: string, date: string, notes: string, receiptImage: string, vendor: string, category: string }>;

      setFormData((prev) => ({
        ...prev,
        amount: expenseData.total || prev.amount,
        date: expenseData.date || prev.date,
        notes: expenseData.notes || prev.notes,
        vendor: expenseData.vendor || prev.vendor,
        category: expenseData.category || prev.category,
      }))

      if (expenseData.receiptImage) {
        setReceiptImage(expenseData.receiptImage)
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{expenseToEdit ? t('expenses:newExpenseModal.editTitle') : t('expenses:newExpenseModal.newTitle')}</DialogTitle>
          <DialogDescription>{t('expenses:newExpenseModal.description')}</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto pr-1">
          <form id="expense-form" onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">{t('expenses:newExpenseModal.amountLabel')}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{t('expenses:newExpenseModal.currencySymbol')}</span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder={t('expenses:newExpenseModal.amountPlaceholder')}
                    className="pl-8"
                    step="0.01"
                    min="0"
                    required
                    value={formData.amount}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">{t('expenses:newExpenseModal.dateLabel')}</Label>
                <Input id="date" type="date" required value={formData.date} onChange={handleInputChange} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor">{t('expenses:newExpenseModal.vendorLabel')}</Label>
              <Input
                id="vendor"
                placeholder={t('expenses:newExpenseModal.vendorPlaceholder')}
                required
                value={formData.vendor}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">{t('expenses:newExpenseModal.categoryLabel')}</Label>
              <Select
                required
                value={formData.category}
                onValueChange={(value) => handleSelectChange("category", value)}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder={t('expenses:newExpenseModal.categoryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utilities">{t('expenses:newExpenseModal.categoryOptions.utilities')}</SelectItem>
                  <SelectItem value="supplies">{t('expenses:newExpenseModal.categoryOptions.supplies')}</SelectItem>
                  <SelectItem value="maintenance">{t('expenses:newExpenseModal.categoryOptions.maintenance')}</SelectItem>
                  <SelectItem value="salaries">{t('expenses:newExpenseModal.categoryOptions.salaries')}</SelectItem>
                  <SelectItem value="events">{t('expenses:newExpenseModal.categoryOptions.events')}</SelectItem>
                  <SelectItem value="other">{t('expenses:newExpenseModal.categoryOptions.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">{t('expenses:newExpenseModal.paymentMethodLabel')}</Label>
              <Select
                required
                value={formData.paymentMethod}
                onValueChange={(value) => handleSelectChange("paymentMethod", value)}
              >
                <SelectTrigger id="paymentMethod">
                  <SelectValue placeholder={t('expenses:newExpenseModal.paymentMethodPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('expenses:newExpenseModal.paymentMethodOptions.cash')}</SelectItem>
                  <SelectItem value="check">{t('expenses:newExpenseModal.paymentMethodOptions.check')}</SelectItem>
                  <SelectItem value="credit-card">{t('expenses:newExpenseModal.paymentMethodOptions.creditCard')}</SelectItem>
                  <SelectItem value="bank-transfer">{t('expenses:newExpenseModal.paymentMethodOptions.bankTransfer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t('expenses:newExpenseModal.notesLabel')}</Label>
              <Textarea
                id="notes"
                placeholder={t('expenses:newExpenseModal.notesPlaceholder')}
                required
                value={formData.notes}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('expenses:newExpenseModal.receiptLabel')}</Label>
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-6">
                {receiptImage ? (
                  <div className="w-full">
                    <div className="relative mb-2">
                      <img
                        src={receiptImage || "/placeholder.svg"}
                        alt="Receipt"
                        className="max-h-40 mx-auto object-contain rounded-md"
                      />
                    </div>
                    <div className="flex justify-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setReceiptImage(null)}>
                        {t('expenses:newExpenseModal.removeReceiptButton')}
                      </Button>
                      <ReceiptScannerButton onDataCaptured={handleReceiptData} variant="outline" size="sm">
                        {t('expenses:newExpenseModal.replaceReceiptButton')}
                      </ReceiptScannerButton>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Receipt className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 mb-4 text-center">
                      {t('expenses:newExpenseModal.addReceiptInfo')}
                    </p>
                    <ReceiptScannerButton onDataCaptured={handleReceiptData}>{t('expenses:newExpenseModal.addReceiptButton')}</ReceiptScannerButton>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        <DialogFooter className="mt-2 pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('expenses:newExpenseModal.cancelButton')}
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            onClick={() => {
              (document.getElementById("expense-form") as HTMLFormElement)?.requestSubmit()
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {expenseToEdit ? t('expenses:newExpenseModal.updating') : t('expenses:newExpenseModal.saving')}
              </>
            ) : expenseToEdit ? (
              t('expenses:newExpenseModal.updateButton')
            ) : (
              t('expenses:newExpenseModal.saveButton')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

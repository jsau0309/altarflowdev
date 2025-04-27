"use client"

import { DialogFooter } from "@/components/ui/dialog"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Receipt } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ReceiptScannerButton } from "@/components/receipt-scanner/receipt-scanner-button"
import { useTranslation } from "react-i18next"
import type { Expense } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library';

interface NewExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  expenseToEdit?: Expense
}

export function NewExpenseModal({ isOpen, onClose, expenseToEdit }: NewExpenseModalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [receiptImage, setReceiptImage] = useState<string | null>(null)
  const [receiptPath, setReceiptPath] = useState<string | null>(null)
  
  // Function to safely format date string to YYYY-MM-DD
  const formatDateForInput = (dateInput: Date | string | undefined | null): string => {
    if (!dateInput) return new Date().toISOString().split("T")[0];
    try {
      // Date constructor handles both Date objects and ISO strings
      const dateObj = new Date(dateInput);
      // Check if the date is valid after parsing
      if (isNaN(dateObj.getTime())) {
          throw new Error("Invalid date input");
      }
      return dateObj.toISOString().split("T")[0];
    } catch (error) {
      console.error("Error formatting date:", error);
      return new Date().toISOString().split("T")[0]; // Fallback to today
    }
  };

  const [formData, setFormData] = useState({
    amount: "",
    expenseDate: new Date().toISOString().split("T")[0],
    vendor: "",
    category: "",
    description: "",
  })
  const { t } = useTranslation('expenses');

  // useEffect to update form when expenseToEdit changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        // Edit mode: Populate form with expenseToEdit data
        setFormData({
          amount: expenseToEdit.amount?.toString() || "",
          expenseDate: formatDateForInput(expenseToEdit.expenseDate),
          vendor: expenseToEdit.vendor || "",
          category: expenseToEdit.category || "",
          description: expenseToEdit.description || "",
        });
        setReceiptImage(expenseToEdit.receiptUrl || null);
        // Remove receiptPath since it's not in the Expense type
      } else {
        // New mode: Reset form to defaults
        setFormData({
          amount: "",
          expenseDate: new Date().toISOString().split("T")[0],
          vendor: "",
          category: "",
          description: "",
        });
        setReceiptImage(null);
        setReceiptPath(null);
      }
    } else {
        // Optional: Reset form when modal closes, though resetting on open is key
        setFormData({
            amount: "",
            expenseDate: new Date().toISOString().split("T")[0],
            vendor: "",
            category: "",
            description: "",
        });
        setReceiptImage(null);
        setReceiptPath(null);
    }
  }, [isOpen, expenseToEdit]); // Dependency array includes isOpen and expenseToEdit

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (id: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    let apiError: string | null = null;

    // Ensure date is treated as UTC
    const utcExpenseDate = formData.expenseDate ? `${formData.expenseDate}T00:00:00Z` : new Date().toISOString();

    const payload = {
      amount: parseFloat(formData.amount) || 0,
      expenseDate: new Date(utcExpenseDate).toISOString(), // Use the UTC-adjusted date string
      category: formData.category,
      vendor: formData.vendor || null,
      description: formData.description || null,
      receiptUrl: receiptImage || null,
      receiptPath: receiptPath || null,
    };

    try {
      let response;
      if (expenseToEdit) {
        response = await fetch(`/api/expenses/${expenseToEdit.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${expenseToEdit ? 'update' : 'create'} expense`);
      }

      onClose();

    } catch (err) {
      console.error("Expense form submission error:", err);
      apiError = err instanceof Error ? err.message : "An unexpected error occurred.";
      alert(`Error: ${apiError}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReceiptData = (data: unknown) => {
    if (typeof data === 'object' && data !== null) {
      const expenseData = data as Partial<{ 
        total: string, 
        date: string, 
        notes: string, 
        receiptImage: string, 
        receiptUrl: string,
        receiptPath: string,
        vendor: string, 
        category: string 
      }>;

      setFormData((prev) => ({
        ...prev,
        amount: expenseData.total || prev.amount,
        expenseDate: expenseData.date || prev.expenseDate,
        notes: expenseData.notes || prev.description,
        vendor: expenseData.vendor || prev.vendor,
        category: expenseData.category || prev.category,
      }))

      if (expenseData.receiptUrl) {
        setReceiptImage(expenseData.receiptUrl);
      } else if (expenseData.receiptImage) {
        setReceiptImage(expenseData.receiptImage);
      }
      
      if (expenseData.receiptPath) {
        setReceiptPath(expenseData.receiptPath);
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
                <Label htmlFor="expenseDate">{t('expenses:newExpenseModal.dateLabel')}</Label>
                <Input id="expenseDate" name="expenseDate" type="date" required value={formData.expenseDate} onChange={handleInputChange} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor">{t('expenses:newExpenseModal.vendorLabel')}</Label>
              <Input
                id="vendor"
                placeholder={t('expenses:newExpenseModal.vendorPlaceholder')}
                value={formData.vendor}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">{t('expenses:newExpenseModal.categoryLabel')}</Label>
              <select 
                id="category" 
                name="category" 
                required 
                value={formData.category} 
                onChange={(e) => handleSelectChange("category", e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
              >
                <option value="" disabled>{t('expenses:newExpenseModal.categoryPlaceholder')}</option>
                <option value="utilities">{t('expenses:newExpenseModal.categoryOptions.utilities')}</option>
                <option value="supplies">{t('expenses:newExpenseModal.categoryOptions.supplies')}</option>
                <option value="maintenance">{t('expenses:newExpenseModal.categoryOptions.maintenance')}</option>
                <option value="salaries">{t('expenses:newExpenseModal.categoryOptions.salaries')}</option>
                <option value="events">{t('expenses:newExpenseModal.categoryOptions.events')}</option>
                <option value="other">{t('expenses:newExpenseModal.categoryOptions.other')}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('expenses:newExpenseModal.notesLabel')}</Label>
              <Textarea
                id="description" name="description"
                placeholder={t('expenses:newExpenseModal.notesPlaceholder')}
                value={formData.description}
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
            type="button"
            disabled={isLoading}
            onClick={(e) => {
              handleSubmit(e as any);
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

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
import { useTranslation } from "react-i18next";
import { toast } from 'sonner';
import type { Expense } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library';

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseToEdit?: Expense; // Restored for editing existing expenses
  onSuccess?: () => void; // For refreshing data after action
}

export function NewExpenseModal({ isOpen, onClose, expenseToEdit, onSuccess }: NewExpenseModalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [receiptImage, setReceiptImage] = useState<string | null>(null)
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptMetadata, setReceiptMetadata] = useState<Record<string, unknown> | null>(null);
  
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
        setReceiptPath(expenseToEdit.receiptPath || null); // Populate receiptPath for editing
        setReceiptFile(null);
        setReceiptMetadata(null);
      } else {
        // New mode: Reset form to defaults using the resetForm function
        resetForm();
      }
    }
  }, [isOpen, expenseToEdit]); // Dependency array includes isOpen and expenseToEdit

  const resetForm = () => {
    setFormData({
      amount: "",
      expenseDate: formatDateForInput(new Date()), // Use formatDateForInput for consistency
      vendor: "",
      category: "",
      description: "",
    });
    setReceiptImage(null);
    setReceiptPath(null);
    setReceiptFile(null);
    setReceiptMetadata(null);
  };

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

    // Client-side validation for amount
    const amountValue = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amountValue) || amountValue <= 0) {
      toast.error(t('expenses:newExpenseModal.validation.amountRequired', 'Please enter a valid amount.'));
      return; // Prevent submission
    }

    // Client-side validation for date
    if (!formData.expenseDate) {
      toast.error(t('expenses:newExpenseModal.validation.dateRequired', 'Please select a date.'));
      return; // Prevent submission
    }

    // Client-side validation for category
    if (!formData.category) {
      toast.error(t('expenses:newExpenseModal.validation.categoryRequired', 'Please select a category.'));
      return; // Prevent submission
    }

    setIsLoading(true);
    let apiError: string | null = null;

    // Create date at noon local time to avoid timezone issues
    const expenseDate = formData.expenseDate 
      ? new Date(`${formData.expenseDate}T12:00:00`) // Noon in local timezone
      : new Date();

    const normalizedAmount = parseFloat(formData.amount) || 0

    const formPayload = new FormData()
    formPayload.append('amount', String(normalizedAmount))
    formPayload.append('expenseDate', expenseDate.toISOString())
    formPayload.append('category', formData.category)

    formPayload.append('vendor', formData.vendor ?? '')
    formPayload.append('description', formData.description ?? '')
    if (receiptFile) {
      formPayload.append('receipt', receiptFile, receiptFile.name)
    }
    if (receiptMetadata) {
      formPayload.append('receiptMetadata', JSON.stringify(receiptMetadata))
    }
    if (receiptPath && !receiptFile) {
      formPayload.append('receiptPath', receiptPath)
    }

    const previousReceiptPath = expenseToEdit?.receiptPath ?? null
    const hasPreviousReceipt = Boolean(previousReceiptPath)
    const receiptRemoved = hasPreviousReceipt && !receiptFile && !receiptPath

    if (expenseToEdit && previousReceiptPath && receiptFile) {
      formPayload.append('previousReceiptPath', previousReceiptPath)
    }

    if (expenseToEdit && receiptRemoved && previousReceiptPath) {
      formPayload.append('previousReceiptPath', previousReceiptPath)
      formPayload.append('removeReceipt', 'true')
    }

    try {
      const endpoint = expenseToEdit ? `/api/expenses/${expenseToEdit.id}` : '/api/expenses'
      const method = expenseToEdit ? 'PATCH' : 'POST'

      const response = await fetch(endpoint, {
        method,
        body: formPayload,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${expenseToEdit ? 'update' : 'create'} expense`);
      }

      // Show success toast
      if (expenseToEdit) {
        toast.success(t('expenses:newExpenseModal.updateSuccess'));
        // For edit, refresh is handled by the page, or onSuccess if provided for dashboard context
        if (onSuccess) {
          onSuccess();
        }
        onClose(); // Close modal after successful edit
      } else {
        // For new expense creation
        toast.success(t('expenses:newExpenseModal.createSuccess'));
        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh(); // Fallback if no onSuccess is provided
        }
        resetForm();
        onClose(); // Ensure modal closes after successful creation
      }

    } catch (err) {
      console.error("Expense form submission error:", err);
      apiError = err instanceof Error ? err.message : "An unexpected error occurred.";
      // Show error toast
      if (expenseToEdit) {
        toast.error(`${t('expenses:newExpenseModal.updateError')}: ${apiError}`);
      } else {
        toast.error(`${t('expenses:newExpenseModal.createError')}: ${apiError}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReceiptData = (data: unknown) => {
    if (typeof data !== 'object' || data === null) {
      return;
    }

    const expenseData = data as Partial<{
      total: string | number
      date: string
      description: string
      receiptImage: string
      receiptUrl: string
      receiptPath: string | null
      vendor: string
      category: string
      receiptFile: File | null
      receiptMetadata: Record<string, unknown> | null
    }>

    setFormData((prev) => ({
      ...prev,
      amount: expenseData.total ? String(expenseData.total) : prev.amount,
      expenseDate: expenseData.date || prev.expenseDate,
      description: expenseData.description || prev.description,
      vendor: expenseData.vendor || prev.vendor,
      category: expenseData.category || prev.category,
    }))

    if (expenseData.receiptFile instanceof File) {
      setReceiptFile(expenseData.receiptFile)
    } else if ('receiptFile' in expenseData) {
      setReceiptFile(null)
    }

    if ('receiptMetadata' in expenseData) {
      const metadataCandidate = expenseData.receiptMetadata
      setReceiptMetadata(
        metadataCandidate && typeof metadataCandidate === 'object'
          ? metadataCandidate
          : null
      )
    }

    if ('receiptPath' in expenseData) {
      setReceiptPath(expenseData.receiptPath ?? null)
    }

    if (expenseData.receiptUrl) {
      setReceiptImage(expenseData.receiptUrl)
    } else if (expenseData.receiptImage) {
      setReceiptImage(expenseData.receiptImage)
    } else if (expenseData.receiptFile instanceof File) {
      const objectUrl = URL.createObjectURL(expenseData.receiptFile)
      setReceiptImage(objectUrl)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full sm:max-w-[500px] sm:max-h-[90vh] sm:h-auto overflow-hidden flex flex-col p-0 sm:p-6 sm:rounded-lg">
        <DialogHeader className="px-6 pt-6 pb-4 sm:px-0 sm:pt-0 sm:pb-0">
          <DialogTitle>{expenseToEdit ? t('expenses:newExpenseModal.editTitle') : t('expenses:newExpenseModal.newTitle')}</DialogTitle>
          <DialogDescription>{t('expenses:newExpenseModal.description')}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 sm:px-1">
          <form id="expense-form" onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Input
                  id="expenseDate"
                  name="expenseDate"
                  type="date"
                  required
                  value={formData.expenseDate}
                  onChange={handleInputChange}
                  className="w-full h-10 text-base"
                />
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
                  <div className="w-full text-center">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                      {/* TODO: Add translation key expenses:newExpenseModal.receiptAttachedMessage */}
                      Receipt Attached
                    </p>
                    <div className="flex justify-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReceiptImage(null);
                          setReceiptPath(null);
                          setReceiptFile(null);
                          setReceiptMetadata(null);
                        }}
                      >
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

        <DialogFooter className="pt-4 pb-6 px-6 border-t sm:px-0 sm:pb-0 flex-col-reverse sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
            {t('expenses:newExpenseModal.cancelButton')}
          </Button>
          <Button
            type="button"
            disabled={isLoading}
            onClick={(e) => {
              handleSubmit(e as any);
            }}
            className="w-full sm:w-auto"
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

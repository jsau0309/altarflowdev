"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Download, Edit, FileText, Loader2, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import type { Expense } from "@prisma/client"
import { Decimal } from '@prisma/client/runtime/library';
import { useTranslation } from "react-i18next"

interface ExpenseDetailsDrawerProps {
  expense: Expense | null
  open: boolean
  onClose: () => void
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
}

const formatCurrency = (amount: number | Decimal | string | null | undefined, currencyCode: string = 'USD') => { 
  // console.log("Drawer Formatting currency for:", typeof amount, amount); // Add log if needed again
  if (amount === null || amount === undefined) return '-';

  let numericAmount: number;
  if (typeof amount === 'number') {
    numericAmount = amount;
  } else if (typeof amount === 'string') {
    numericAmount = parseFloat(amount);
  } else if (typeof amount === 'object' && amount !== null && typeof (amount as any).toNumber === 'function') {
    // Handle Decimal object case (less likely after JSON serialization)
    numericAmount = (amount as Decimal).toNumber();
  } else {
    console.error("Unexpected type for amount in Drawer formatCurrency:", typeof amount, amount);
    return '-';
  }

  if (isNaN(numericAmount)) {
      console.error("Failed to parse amount in Drawer formatCurrency:", amount);
      return '-';
  }

  return new Intl.NumberFormat(undefined, { // Use browser default locale or pass i18n.language
    style: "currency",
    currency: currencyCode,
  }).format(numericAmount)
}

export function ExpenseDetailsDrawer({ expense, open, onClose, onEdit, onDelete }: ExpenseDetailsDrawerProps) {
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false)
  const [currentReceiptUrl, setCurrentReceiptUrl] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const { t } = useTranslation(['expenses', 'common'])

  // Set the currentReceiptUrl from the expense when it changes
  useEffect(() => {
    if (expense?.receiptUrl) {
      setCurrentReceiptUrl(expense.receiptUrl);
    } else {
      setCurrentReceiptUrl(null);
    }
  }, [expense?.receiptUrl]);

  if (!expense) return null

  // Cast expense to include receiptPath if needed (adjust based on actual type)
  const expenseWithPath = expense as unknown as {
    id: string;
    receiptPath?: string | null;
    receiptUrl?: string | null;
    [key: string]: any; // Add index signature if needed
  };

  const handleEdit = () => {
    onEdit(expense)
  }

  const handleDelete = () => {
    onDelete(expense.id)
    setConfirmDelete(false)
  }

  const handleDownload = async () => {
    if (!currentReceiptUrl || !expenseWithPath.receiptPath) return;

    setIsDownloading(true);
    let objectUrl: string | null = null; // To store the temporary URL

    try {
      // Extract filename from the stored path
      const pathParts = expenseWithPath.receiptPath.split('/');
      const filename = pathParts[pathParts.length - 1] || `receipt-${expense.id}`;
      
      // Fetch the image/file data from the signed URL
      const response = await fetch(currentReceiptUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch receipt: ${response.statusText}`);
      }
      const blob = await response.blob();

      // Create a temporary URL for the blob
      objectUrl = URL.createObjectURL(blob);

      // Create a link and trigger download
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename; // Use the extracted filename
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

    } catch (error) {
      console.error("Download failed:", error);
      // Optionally show a toast or error message to the user
      alert(t('expenses:detailsDrawer.downloadError', 'Failed to download receipt.')); 
    } finally {
      // Clean up the temporary object URL
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      setIsDownloading(false);
    }
  };

  // New function to refresh the signed URL when needed
  const refreshReceiptUrl = async (): Promise<string | null> => {
    try {
      setIsLoadingReceipt(true);
      
      const response = await fetch('/api/expenses/refresh-receipt-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expenseId: expense.id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Try to parse error
        console.error('Failed to refresh receipt URL:', response.statusText, errorData);
        // Show error to user
        alert(t('expenses:detailsDrawer.receiptRefreshError', `Error refreshing receipt: ${errorData.error || response.statusText}`));
        return null;
      }

      const data = await response.json();
      setCurrentReceiptUrl(data.receiptUrl);
      return data.receiptUrl;
    } catch (error) {
      console.error('Error refreshing receipt URL:', error);
      alert(t('expenses:detailsDrawer.receiptRefreshError', 'An error occurred while refreshing the receipt URL.'));
      return null;
    } finally {
      setIsLoadingReceipt(false);
    }
  };

  // Function to handle viewing the receipt
  const handleViewReceipt = async () => {
    // Try to refresh the URL first to ensure it's valid
    // If refresh fails, currentReceiptUrl might be null, modal will show error
    await refreshReceiptUrl(); 
    setReceiptModalOpen(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="sm:max-w-md w-[90vw] p-0 flex flex-col">
          <SheetHeader className="p-6 border-b">
            <div className="flex justify-between items-center">
              <SheetTitle>{t('expenses:detailsDrawer.title')}</SheetTitle>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-auto">
            <div className="p-6 space-y-6">
              {/* New Row 1: Amount | Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('expenses:amount')}</p>
                  <p className="text-2xl font-bold">{formatCurrency(expense.amount, expense.currency)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('expenses:category')}</p>
                  <p className="font-medium capitalize">{expense.category}</p>
                </div>
              </div>

              {/* Row 2: Date | Vendor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('expenses:date')}</p>
                  <p className="font-medium">{format(new Date(expense.expenseDate), "PP")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('expenses:vendor')}</p>
                  <p className="font-medium">{expense.vendor || '-'}</p>
                </div>
                {/* Status was previously here, now removed/commented */}
              </div>

              {expense.description && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('expenses:notes', 'Notes/Description')}</p>
                  <p className="mt-1">{expense.description}</p>
                </div>
              )}

              <Separator />

              {expenseWithPath.receiptPath ? ( // Check if receiptPath exists
                <div>
                  <p className="text-sm font-medium mb-2">{t('expenses:receipt')}</p>
                  <div
                    className="border rounded-md overflow-hidden bg-muted/30 cursor-pointer relative group"
                    onClick={handleViewReceipt}
                  >
                    {isLoadingReceipt ? (
                      <div className="flex items-center justify-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : currentReceiptUrl ? (
                      <img
                        src={currentReceiptUrl} // Always use the potentially refreshed URL
                        alt={t('expenses:receipt')}
                        className="w-full h-auto object-contain max-h-60"
                        onError={async (e) => {
                          console.log("Receipt image failed to load (might be expired/invalid), attempting refresh...");
                          const newUrl = await refreshReceiptUrl();
                          if (newUrl && e.target instanceof HTMLImageElement) {
                            e.target.src = newUrl;
                          } else {
                            // If refresh fails, maybe clear the src or show placeholder?
                            console.error("Failed to refresh URL after image load error.");
                            setCurrentReceiptUrl(null); // Clear the bad URL
                          }
                        }}
                      />
                    ) : (
                      // Show if URL is null after trying to load/refresh
                      <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                        <FileText className="h-8 w-8 mb-2" />
                        <p className="text-sm text-center">{t('expenses:detailsDrawer.receiptLoadError')}</p>
                      </div>
                    )}
                    {/* Overlay for view action - shown when not loading and URL exists */}
                    {!isLoadingReceipt && currentReceiptUrl && (
                       <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <p className="text-white font-medium">{t('common:view')}</p>
                       </div>
                    )}
                  </div>
                </div>
              ) : (
                // Show if no receiptPath was ever stored
                <div className="flex flex-col items-center justify-center p-6 border rounded-md border-dashed">
                  <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">{t('expenses:detailsDrawer.noReceipt')}</p>
                </div>
              )}

              <div className="bg-muted/30 p-4 rounded-md">
                <p className="text-sm text-muted-foreground mb-2">{t('common:auditInfo', 'Audit Information')}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('common:createdOn', 'Created on')}</p>
                    <p>{format(new Date(expense.createdAt), "PPpp")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('common:lastModified', 'Last modified')}</p>
                    <p>{format(new Date(expense.updatedAt), "PPpp")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('common:id', 'ID')}</p>
                    <p className="font-mono text-xs">{expense.id}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t">
            <div className="flex gap-2 justify-between">
              <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="text-destructive border-destructive/30">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('common:delete')}
                  </Button>
                </DialogTrigger>
                <DialogContent aria-describedby="delete-confirm-description">
                  <DialogHeader>
                    <DialogTitle>{t('expenses:detailsDrawer.deleteConfirmTitle')}</DialogTitle>
                    <DialogDescription id="delete-confirm-description">
                      {t('expenses:detailsDrawer.deleteConfirmDescription')}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                      {t('common:cancel')}
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                      {t('common:delete')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                {t('common:edit')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-3xl w-[90vw] p-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="p-4 border-b shrink-0">
            <DialogTitle id="receipt-view-title">{t('expenses:receipt')} - {expense?.vendor}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/30 min-h-[200px]">
            {isLoadingReceipt ? (
              <div className="flex items-center justify-center">
                 <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : currentReceiptUrl ? (
              <img
                src={currentReceiptUrl}
                alt={t('expenses:receipt')}
                className="max-w-full max-h-full object-contain"
                onError={async (e) => {
                  console.log("Receipt modal image failed to load, attempting refresh...");
                  const newUrl = await refreshReceiptUrl();
                  if (newUrl && e.target instanceof HTMLImageElement) {
                    e.target.src = newUrl;
                  } else {
                     console.error("Modal: Failed to refresh URL after image load error.");
                     setCurrentReceiptUrl(null); // Clear bad URL
                  }
                }}
              />
            ) : (
              <p className="text-muted-foreground text-center">{t('expenses:detailsDrawer.receiptLoadError')}</p>
            )}
          </div>

          <div className="p-4 border-t flex justify-between items-center shrink-0">
            <Button variant="outline" onClick={() => setReceiptModalOpen(false)}>
              {t('common:close', 'Close')}
            </Button>
            <Button variant="outline" onClick={handleDownload} disabled={!currentReceiptUrl || isDownloading}>
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {t('common:download')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

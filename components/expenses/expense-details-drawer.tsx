"use client"

import { useState, useEffect, useCallback } from "react"
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
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false)
  const [currentReceiptUrl, setCurrentReceiptUrl] = useState<string | null>(null);
  const [receiptUrlExpiry, setReceiptUrlExpiry] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState(false)
  const { t } = useTranslation(['expenses', 'common'])

  // New function to refresh the signed URL when needed
  const refreshReceiptUrl = useCallback(async (): Promise<string | null> => {
    if (!expense || !expense.id) {
      console.error('[ExpenseDetailsDrawer refreshReceiptUrl] Aborted: expense or expense.id is null/undefined.');
      return null;
    }
    console.log('[ExpenseDetailsDrawer refreshReceiptUrl] Called for expense ID:', expense.id);
    try {
      setIsLoadingReceipt(true);
      
      const response = await fetch('/api/expenses/refresh-receipt-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expenseId: expense.id }),
      });

      const responseText = await response.text();
      console.log('[ExpenseDetailsDrawer refreshReceiptUrl] Raw API response text:', responseText);

      if (!response.ok) {
        let errorData = {};
        try {
          errorData = JSON.parse(responseText); // Try to parse error from the text we already fetched
        } catch (e) {
          console.error('[ExpenseDetailsDrawer refreshReceiptUrl] Failed to parse error response as JSON:', e);
          errorData = { error: responseText.substring(0, 100) }; // Fallback to raw text snippet
        }
        console.error('Failed to refresh receipt URL API Response:', response.status, response.statusText, errorData);
        alert(t('expenses:detailsDrawer.receiptRefreshError', `Error refreshing receipt: ${(errorData as any).error || response.statusText}`));
        return null;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('[ExpenseDetailsDrawer refreshReceiptUrl] Failed to parse successful response as JSON:', responseText, e);
        alert(t('expenses:detailsDrawer.receiptRefreshError', 'Received an invalid response from the server.'));
        setCurrentReceiptUrl(null);
        setReceiptUrlExpiry(0);
        return null;
      }
      const newUrl = data.receiptUrl;

      console.log("[ExpenseDetailsDrawer] Fetched new signed URL from API:", newUrl);

      if (newUrl) {
        try {
          console.log("[ExpenseDetailsDrawer] Attempting to test-fetch new URL:", newUrl);
          const testResponse = await fetch(newUrl);
          console.log("[ExpenseDetailsDrawer] Test fetch status:", testResponse.status, "OK:", testResponse.ok);
          if (!testResponse.ok) {
            console.error("[ExpenseDetailsDrawer] Test fetch FAILED for new URL:", newUrl, "Status Text:", testResponse.statusText);
          }
        } catch (fetchError) {
          console.error("[ExpenseDetailsDrawer] Error during test fetch of new URL:", newUrl, fetchError);
        }
        setCurrentReceiptUrl(newUrl);
        if (newUrl) setReceiptUrlExpiry(Date.now() + 50 * 60 * 1000); // 50 minutes expiry
      } else {
        console.warn("[ExpenseDetailsDrawer] API did not return a newUrl.");
        setCurrentReceiptUrl(null);
        setReceiptUrlExpiry(0);
      }
      return newUrl;
    } catch (error) {
      console.error('Error refreshing receipt URL:', error);
      alert(t('expenses:detailsDrawer.receiptRefreshError', 'An error occurred while refreshing the receipt URL.'));
      return null;
    } finally {
      setIsLoadingReceipt(false);
    }
  }, [expense?.id, t, setIsLoadingReceipt, setCurrentReceiptUrl, setReceiptUrlExpiry]);

  useEffect(() => {
    console.log('[ExpenseDetailsDrawer useEffect] Triggered. Open:', open, 'Expense ID:', expense?.id, 'Raw Expense Prop Receipt Path:', expense?.receiptPath, 'Current Expense Object:', JSON.stringify(expense));
    const isMounted = true; // To prevent state updates on unmounted component

    if (open && expense?.id) { // Only act if drawer is open and there's an expense
      if (expense.receiptPath) { // Check for receiptPath
        if (!currentReceiptUrl || Date.now() > receiptUrlExpiry) {
          // console.log("[ExpenseDetailsDrawer useEffect] Condition: URL refresh needed. Calling refreshReceiptUrl.");
          refreshReceiptUrl();
        } else {
          // console.log("[ExpenseDetailsDrawer useEffect] Condition: URL is current. Setting isLoadingReceipt: false");
          setIsLoadingReceipt(false);
        }
      } else { // No receipt path for this expense
        // console.log("[ExpenseDetailsDrawer useEffect] Condition: No expense.receiptPath. Clearing URL and setting isLoadingReceipt: false");
        setCurrentReceiptUrl(null);
        setReceiptUrlExpiry(0);
        setIsLoadingReceipt(false);
      }
    } else if (!open) { // Drawer is closed
      // console.log("[ExpenseDetailsDrawer useEffect] Drawer closed. Resetting receipt URL state.");
      setCurrentReceiptUrl(null);
      setReceiptUrlExpiry(0);
      setIsLoadingReceipt(false); // Ensure loading is off when closed
    }
  }, [open, expense?.id, expense?.receiptPath, refreshReceiptUrl, currentReceiptUrl, receiptUrlExpiry]);

  if (!expense) return null;

  // Cast expense to include receiptPath if needed (adjust based on actual type)
  const expenseWithPath = expense as Expense & { receiptPath?: string | null };
  console.log('[ExpenseDetailsDrawer Render] expenseWithPath for UI:', expenseWithPath, 'Receipt Path from expenseWithPath:', expenseWithPath?.receiptPath);

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



  console.log(`[ExpenseDetailsDrawer Render] isLoadingReceipt: ${isLoadingReceipt}, currentReceiptUrl: ${currentReceiptUrl ? 'exists' : 'null'}`);

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
                  <div className="p-2 border rounded-md min-h-[60px] flex items-center justify-center bg-muted/10">
                    {isLoadingReceipt ? (
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    ) : currentReceiptUrl ? (
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={currentReceiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={t('expenses:detailsDrawer.viewReceiptAriaLabel', `View receipt for ${expense?.vendor || 'this expense'}`)}
                          className="flex items-center"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          {t('expenses:detailsDrawer.viewReceipt', 'View Receipt')}
                        </a>
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center px-2">
                        {expenseWithPath.receiptPath 
                          ? t('expenses:detailsDrawer.receiptLinkError', 'Could not load receipt link.') 
                          : t('expenses:detailsDrawer.noReceiptAvailable', 'No receipt available.')
                        }
                      </p>
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

    </>
  )
}

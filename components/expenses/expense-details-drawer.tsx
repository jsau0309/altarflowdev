"use client"


import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { Edit, FileText, Loader2, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Expense } from "@prisma/client"
import { Decimal } from '@prisma/client/runtime/library';
import { useTranslation } from "react-i18next"
import { toast as sonnerToast } from "sonner"

type ExpenseWithCategory = Expense & {
  ExpenseCategory?: {
    id: string;
    name: string;
    color: string;
  } | null;
};

interface ExpenseDetailsDrawerProps {
  expense: ExpenseWithCategory | null
  open: boolean
  onClose: () => void
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
  userRole?: "ADMIN" | "STAFF" | null
  isDeleting?: boolean
}

const formatCurrency = (amount: number | Decimal | string | null | undefined, currencyCode: string = 'USD') => {
  console.log('Drawer Formatting currency for', {
    operation: 'ui.expense.format_currency',
    amountType: typeof amount,
    amountValue: String(amount)
  });
  if (amount === null || amount === undefined) return '-';

  let numericAmount: number;
  if (typeof amount === 'number') {
    numericAmount = amount;
  } else if (typeof amount === 'string') {
    numericAmount = parseFloat(amount);
  } else if (typeof amount === 'object' && amount !== null && 'toNumber' in amount && typeof amount.toNumber === 'function') {
    // Handle Decimal object case (less likely after JSON serialization)
    numericAmount = (amount as Decimal).toNumber();
  } else {
    console.error('Unexpected type for amount in Drawer formatCurrency', {
      operation: 'ui.expense.format_error',
      amountType: typeof amount,
      amountValue: String(amount)
    });
    return '-';
  }

  if (isNaN(numericAmount)) {
      console.error('Failed to parse amount in Drawer formatCurrency', {
        operation: 'ui.expense.parse_error',
        amountValue: String(amount)
      });
      return '-';
  }

  return new Intl.NumberFormat(undefined, { // Use browser default locale or pass i18n.language
    style: "currency",
    currency: currencyCode,
  }).format(numericAmount)
}

export function ExpenseDetailsDrawer({ expense, open, onClose, onEdit, onDelete, userRole, isDeleting }: ExpenseDetailsDrawerProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false)
  const [currentReceiptUrl, setCurrentReceiptUrl] = useState<string | null>(null);
  const [receiptUrlExpiry, setReceiptUrlExpiry] = useState<number>(0);
  // const [isDownloading, setIsDownloading] = useState(false)
  const { t } = useTranslation(['expenses', 'common', 'settings'])

  // Helper function to translate system category names
  const getTranslatedCategoryName = (categoryName: string): string => {
    const key = `settings:systemCategories.expenseCategories.${categoryName}`;
    const translated = t(key, categoryName);
    return translated === key ? categoryName : translated;
  };

  // Get category name with fallback to legacy field
  const getCategoryDisplay = () => {
    if (expense?.ExpenseCategory) {
      return getTranslatedCategoryName(expense.ExpenseCategory.name);
    }
    if (expense?.category) {
      return getTranslatedCategoryName(expense.category);
    }
    return '-';
  };

  // New function to refresh the signed URL when needed
  const refreshReceiptUrl = useCallback(async (): Promise<string | null> => {
    if (!expense || !expense.id) {
      console.error('[ExpenseDetailsDrawer refreshReceiptUrl] Aborted: expense or expense.id is null/undefined.', { operation: 'ui.error' });
      return null;
    }
    // Debug logging removed: refreshing receipt URL for expense
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
      // Debug logging removed: raw API response text

      if (!response.ok) {
        let errorData = {};
        try {
          errorData = JSON.parse(responseText); // Try to parse error from the text we already fetched
        } catch (e) {
          console.error('[ExpenseDetailsDrawer refreshReceiptUrl] Failed to parse error response as JSON:', { operation: 'ui.error' }, e instanceof Error ? e : new Error(String(e)));
          errorData = { error: responseText.substring(0, 100) }; // Fallback to raw text snippet
        }
        console.error('Failed to refresh receipt URL API Response', {
          operation: 'ui.expense.receipt_refresh_error',
          status: response.status,
          statusText: response.statusText,
          errorData
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
        });
        alert(t('expenses:detailsDrawer.receiptRefreshError', `Error refreshing receipt: ${(errorData as any).error || response.statusText}`));
        return null;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('[ExpenseDetailsDrawer refreshReceiptUrl] Failed to parse successful response as JSON', {
          operation: 'ui.expense.receipt_parse_error',
          responseText
        }, e instanceof Error ? e : new Error(String(e)));
        alert(t('expenses:detailsDrawer.receiptRefreshError', 'Received an invalid response from the server.'));
        setCurrentReceiptUrl(null);
        setReceiptUrlExpiry(0);
        return null;
      }
      const newUrl = data.receiptUrl;

      // Debug logging removed: fetched new signed URL

      if (newUrl) {
        try {
          // Debug logging removed: testing new URL
          const testResponse = await fetch(newUrl);
          // Debug logging removed: test fetch status
          if (!testResponse.ok) {
            console.error('[ExpenseDetailsDrawer] Test fetch FAILED for new URL', {
              operation: 'ui.expense.receipt_test_failed',
              url: newUrl,
              statusText: testResponse.statusText
            });
          }
        } catch (fetchError) {
          console.error('[ExpenseDetailsDrawer] Error during test fetch of new URL', {
            operation: 'ui.expense.receipt_fetch_error',
            url: newUrl
          }, fetchError instanceof Error ? fetchError : new Error(String(fetchError)));
        }
        setCurrentReceiptUrl(newUrl);
        if (newUrl) setReceiptUrlExpiry(Date.now() + 50 * 60 * 1000); // 50 minutes expiry
      } else {
        console.warn('[ExpenseDetailsDrawer] API did not return a newUrl.', { operation: 'ui.warn' });
        setCurrentReceiptUrl(null);
        setReceiptUrlExpiry(0);
      }
      return newUrl;
    } catch (error) {
      console.error('Error refreshing receipt URL:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
      alert(t('expenses:detailsDrawer.receiptRefreshError', 'An error occurred while refreshing the receipt URL.'));
      return null;
    } finally {
      setIsLoadingReceipt(false);
    }
  }, [expense, t]);

  useEffect(() => {
    // Debug logging removed: expense details drawer effect triggered
    // const isMounted = true; // To prevent state updates on unmounted component

    if (open && expense?.id) { // Only act if drawer is open and there's an expense
      if (expense.receiptPath) { // Check for receiptPath
        if (!currentReceiptUrl || Date.now() > receiptUrlExpiry) {
          // console.log('[ExpenseDetailsDrawer useEffect] Condition: URL refresh needed. Calling refreshReceiptUrl.', { operation: 'ui.debug' });
          refreshReceiptUrl();
        } else {
          // console.log('[ExpenseDetailsDrawer useEffect] Condition: URL is current. Setting isLoadingReceipt: false', { operation: 'ui.debug' });
          setIsLoadingReceipt(false);
        }
      } else { // No receipt path for this expense
        // console.log('[ExpenseDetailsDrawer useEffect] Condition: No expense.receiptPath. Clearing URL and setting isLoadingReceipt: false', { operation: 'ui.debug' });
        setCurrentReceiptUrl(null);
        setReceiptUrlExpiry(0);
        setIsLoadingReceipt(false);
      }
    } else if (!open) { // Drawer is closed
      // console.log('[ExpenseDetailsDrawer useEffect] Drawer closed. Resetting receipt URL state.', { operation: 'ui.debug' });
      setCurrentReceiptUrl(null);
      setReceiptUrlExpiry(0);
      setIsLoadingReceipt(false); // Ensure loading is off when closed
    }
  }, [open, expense?.id, expense?.receiptPath, refreshReceiptUrl, currentReceiptUrl, receiptUrlExpiry]);

  if (!expense) return null;

  // Cast expense to include receiptPath if needed (adjust based on actual type)
  const expenseWithPath = expense as Expense & { receiptPath?: string | null };
  // Debug logging removed: expense with path for UI rendering

  const handleEdit = () => {
    onEdit(expense)
  }

  const handleDeleteClick = () => {
    // Check permission first
    if (userRole !== "ADMIN") {
      sonnerToast.error("Permission denied", {
        description: "Only administrators can delete expenses.",
      });
      return;
    }
    // Show confirmation dialog
    setConfirmDelete(true);
  }

  const handleDelete = () => {
    onDelete(expense.id)
    setConfirmDelete(false)
  }

  // const handleDownload = async () => {
  //   if (!currentReceiptUrl || !expenseWithPath.receiptPath) return;

  //   setIsDownloading(true);
  //   let objectUrl: string | null = null; // To store the temporary URL

  //   try {
  //     // Extract filename from the stored path
  //     const pathParts = expenseWithPath.receiptPath.split('/');
  //     const filename = pathParts[pathParts.length - 1] || `receipt-${expense.id}`;
      
  //     // Fetch the image/file data from the signed URL
  //     const response = await fetch(currentReceiptUrl);
  //     if (!response.ok) {
  //       throw new Error(`Failed to fetch receipt: ${response.statusText}`);
  //     }
  //     const blob = await response.blob();

  //     // Create a temporary URL for the blob
  //     objectUrl = URL.createObjectURL(blob);

  //     // Create a link and trigger download
  //     const a = document.createElement("a");
  //     a.href = objectUrl;
  //     a.download = filename; // Use the extracted filename
  //     document.body.appendChild(a);
  //     a.click();
  //     document.body.removeChild(a);

  //   } catch (error) {
  //     console.error('Download failed:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
  //     // Optionally show a toast or error message to the user
  //     alert(t('expenses:detailsDrawer.downloadError', 'Failed to download receipt.')); 
  //   } finally {
  //     // Clean up the temporary object URL
  //     if (objectUrl) {
  //       URL.revokeObjectURL(objectUrl);
  //     }
  //     setIsDownloading(false);
  //   }
  // };



  // Debug logging removed: receipt loading state

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
                  <div className="flex items-center gap-2">
                    {expense.ExpenseCategory?.color && (
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: expense.ExpenseCategory.color }}
                      />
                    )}
                    <p className="font-medium capitalize">{getCategoryDisplay()}</p>
                  </div>
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
              <Button 
                variant="outline" 
                className={userRole !== "ADMIN" ? "text-muted-foreground border-muted-foreground/30" : "text-destructive border-destructive/30"}
                disabled={isDeleting}
                onClick={handleDeleteClick}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common:deleting', 'Deleting...')}
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('common:delete')} {userRole !== "ADMIN" && "(Admin only)"}
                  </>
                )}
              </Button>

              <Button onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                {t('common:edit')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('expenses:detailsDrawer.deleteConfirmTitle', 'Confirm Deletion')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('expenses:detailsDrawer.deleteConfirmDescription', 'Are you sure you want to delete this expense? This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('common:cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common:delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

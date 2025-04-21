"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Download, Edit, FileText, Trash2 } from "lucide-react"

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
import type { Expense } from "@/lib/mock-data"
import { useTranslation } from "react-i18next"

interface ExpenseDetailsDrawerProps {
  expense: Expense | null
  open: boolean
  onClose: () => void
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}

export function ExpenseDetailsDrawer({ expense, open, onClose, onEdit, onDelete }: ExpenseDetailsDrawerProps) {
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { t } = useTranslation(['expenses', 'common'])

  if (!expense) return null

  const handleEdit = () => {
    onEdit(expense)
    onClose()
  }

  const handleDelete = () => {
    onDelete(expense)
    setConfirmDelete(false)
    onClose()
  }

  const handleDownload = () => {
    if (expense.receiptUrl) {
      const a = document.createElement("a")
      a.href = expense.receiptUrl
      a.download = `receipt-${expense.vendor.replace(/\s+/g, "-").toLowerCase()}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

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
              {/* Header with amount */}
              <div>
                <p className="text-sm text-muted-foreground">{t('expenses:amount')}</p>
                <p className="text-2xl font-bold">${expense.amount.toLocaleString()}</p>
              </div>

              {/* Basic details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('expenses:date')}</p>
                  <p className="font-medium">{format(new Date(expense.date), "PP")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('expenses:vendor')}</p>
                  <p className="font-medium">{expense.vendor}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('expenses:category')}</p>
                  <p className="font-medium capitalize">{expense.category}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('expenses:paymentMethod')}</p>
                  <p className="font-medium capitalize">{expense.paymentMethod.replace("-", " ")}</p>
                </div>
              </div>

              {/* Description */}
              {expense.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('expenses:notes')}</p>
                  <p className="mt-1">{expense.notes}</p>
                </div>
              )}

              <Separator />

              {/* Receipt */}
              {expense.receiptUrl ? (
                <div>
                  <p className="text-sm font-medium mb-2">{t('expenses:receipt')}</p>
                  <div
                    className="border rounded-md overflow-hidden bg-muted/30 cursor-pointer"
                    onClick={() => setReceiptModalOpen(true)}
                  >
                    <img
                      src={expense.receiptUrl || "/placeholder.svg"}
                      alt={t('expenses:receipt')}
                      className="w-full h-auto object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 border rounded-md border-dashed">
                  <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">{t('expenses:detailsDrawer.noReceipt')}</p>
                </div>
              )}

              {/* Audit information */}
              <div className="bg-muted/30 p-4 rounded-md">
                <p className="text-sm text-muted-foreground mb-2">{t('common:auditInfo', 'Audit Information')}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('common:createdBy', 'Created by')}</p>
                    <p>Admin User</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('common:createdOn', 'Created on')}</p>
                    <p>{format(new Date(expense.date), "PP")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('common:lastModified', 'Last modified')}</p>
                    <p>{format(new Date(), "PP")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('common:id', 'ID')}</p>
                    <p className="font-mono text-xs">{expense.id}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="p-6 border-t">
            <div className="flex gap-2 justify-between">
              <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="text-destructive border-destructive/30">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('common:delete')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('expenses:detailsDrawer.deleteConfirmTitle')}</DialogTitle>
                    <DialogDescription>
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

      {/* Simplified Receipt Modal */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="max-w-3xl w-[90vw] p-0 flex flex-col">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>{t('expenses:receipt')} - {expense?.vendor}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/30">
            {expense?.receiptUrl && (
              <img
                src={expense.receiptUrl || "/placeholder.svg"}
                alt={t('expenses:receipt')}
                className="max-w-full h-auto object-contain"
              />
            )}
          </div>

          <div className="p-4 border-t flex justify-between">
            <Button variant="outline" onClick={() => setReceiptModalOpen(false)}>
              {t('common:close', 'Close')}
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              {t('common:download')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

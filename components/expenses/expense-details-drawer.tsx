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
      // Create a temporary anchor element
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
              <SheetTitle>Expense Details</SheetTitle>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-auto">
            <div className="p-6 space-y-6">
              {/* Header with amount */}
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="text-2xl font-bold">${expense.amount.toLocaleString()}</p>
              </div>

              {/* Basic details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{format(new Date(expense.date), "MMMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendor</p>
                  <p className="font-medium">{expense.vendor}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium capitalize">{expense.category}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium capitalize">{expense.paymentMethod.replace("-", " ")}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="mt-1">{expense.description}</p>
              </div>

              <Separator />

              {/* Receipt - Simplified */}
              {expense.receiptUrl ? (
                <div>
                  <p className="text-sm font-medium mb-2">Receipt</p>
                  <div
                    className="border rounded-md overflow-hidden bg-muted/30 cursor-pointer"
                    onClick={() => setReceiptModalOpen(true)}
                  >
                    <img
                      src={expense.receiptUrl || "/placeholder.svg"}
                      alt="Receipt"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 border rounded-md border-dashed">
                  <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No receipt attached</p>
                </div>
              )}

              {/* Audit information */}
              <div className="bg-muted/30 p-4 rounded-md">
                <p className="text-sm text-muted-foreground mb-2">Audit Information</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Created by</p>
                    <p>Admin User</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created on</p>
                    <p>{format(new Date(expense.date), "MMM d, yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last modified</p>
                    <p>{format(new Date(), "MMM d, yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">ID</p>
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
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Expense</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this expense? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                      Delete
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Expense
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Simplified Receipt Modal */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="max-w-3xl w-[90vw] p-0 flex flex-col">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Receipt - {expense?.vendor}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/30">
            {expense?.receiptUrl && (
              <img
                src={expense.receiptUrl || "/placeholder.svg"}
                alt="Receipt"
                className="max-w-full h-auto object-contain"
              />
            )}
          </div>

          <div className="p-4 border-t flex justify-between">
            <Button variant="outline" onClick={() => setReceiptModalOpen(false)}>
              Close
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

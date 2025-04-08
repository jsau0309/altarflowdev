"use client"

import { useState, useEffect } from "react"
import { Search, Plus, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { NewExpenseModal } from "@/components/modals/new-expense-modal"
import { mockDataService, type Expense } from "@/lib/mock-data"
import { format } from "date-fns"
import { ExpenseDetailsDrawer } from "./expenses/expense-details-drawer"
import { TablePagination } from "@/components/ui/table-pagination"

export function ExpensesContent() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [showExpenseDetails, setShowExpenseDetails] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)

  // Simulate API loading delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setExpenses(mockDataService.getExpenses())
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  const handleNewExpenseClick = () => {
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    // Refresh the expenses list
    setExpenses(mockDataService.getExpenses())
  }

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense)
    setShowModal(true)
  }

  const handleDeleteExpense = (expense: Expense) => {
    mockDataService.deleteExpense(expense.id)
    // Refresh the expenses list
    setExpenses(mockDataService.getExpenses())
  }

  const handleViewExpenseDetails = (expense: Expense) => {
    setSelectedExpense(expense)
    setShowExpenseDetails(true)
  }

  // Filter expenses based on search term
  const filteredExpenses = expenses.filter((expense) => {
    if (!searchTerm) return true

    return (
      expense.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.amount.toString().includes(searchTerm) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredExpenses.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage)

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Expense Management</h1>
        <p className="text-muted-foreground">Track and manage your church expenses</p>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Expense Records
            </h3>
            <p className="text-sm text-muted-foreground mt-1">View, add, and manage your church expenses</p>
          </div>
          <Button onClick={handleNewExpenseClick} className="gap-2">
            <Plus className="h-4 w-4" />
            New Expense
          </Button>
        </div>

        <div className="p-4">
          <div className="relative w-full max-w-sm mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search expenses..."
              className="w-full rounded-md pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <div className="h-10 bg-muted animate-pulse rounded-md"></div>
              <div className="h-10 bg-muted animate-pulse rounded-md"></div>
              <div className="h-10 bg-muted animate-pulse rounded-md"></div>
              <div className="h-10 bg-muted animate-pulse rounded-md"></div>
            </div>
          ) : filteredExpenses.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((expense) => (
                    <TableRow
                      key={expense.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewExpenseDetails(expense)}
                    >
                      <TableCell>{format(new Date(expense.date), "MMM d, yyyy")}</TableCell>
                      <TableCell>{expense.vendor}</TableCell>
                      <TableCell>{expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}</TableCell>
                      <TableCell>{expense.paymentMethod.replace("-", " ")}</TableCell>
                      <TableCell className="text-right">${expense.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4">
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredExpenses.length}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={setItemsPerPage}
                  showingText={`Showing ${indexOfFirstItem + 1} to ${Math.min(indexOfLastItem, filteredExpenses.length)} of ${filteredExpenses.length} items`}
                />
              </div>
            </>
          ) : (
            <div className="flex min-h-[300px] items-center justify-center rounded-md border border-dashed p-4 sm:p-8 text-center">
              <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                <h3 className="mt-4 text-lg font-semibold">No expenses found</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">
                  {searchTerm ? "Try adjusting your search terms." : "Add your first expense to get started."}
                </p>
                <Button onClick={handleNewExpenseClick}>Add New Expense</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <NewExpenseModal isOpen={showModal} onClose={handleModalClose} expenseToEdit={selectedExpense || undefined} />
      <ExpenseDetailsDrawer
        expense={selectedExpense}
        open={showExpenseDetails}
        onClose={() => setShowExpenseDetails(false)}
        onEdit={handleEditExpense}
        onDelete={handleDeleteExpense}
      />
    </div>
  )
}

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
import { useTranslation } from 'react-i18next'

export function ExpensesContent() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [showExpenseDetails, setShowExpenseDetails] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)
  const { t, i18n } = useTranslation(['expenses', 'donations', 'common'])

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
    setSelectedExpense(null)
    setExpenses(mockDataService.getExpenses())
  }

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense)
    setShowModal(true)
  }

  const handleDeleteExpense = (expense: Expense) => {
    mockDataService.deleteExpense(expense.id)
    setExpenses(mockDataService.getExpenses())
  }

  const handleViewExpenseDetails = (expense: Expense) => {
    setSelectedExpense(expense)
    setShowExpenseDetails(true)
  }

  // Helper function to format category/method using translation keys
  const formatDisplayString = (key: string, namespace: 'expenses' | 'donations', prefix: string, fallback: string) => {
    // Ensure key is valid and lowercase
    const formattedKey = key?.toLowerCase().replace(/\s+|-/g, '') || '';
    if (!formattedKey) return fallback;
    const translationKey = `${namespace}:${prefix}.${formattedKey}`;
    const translated = t(translationKey, fallback);
    // If translation returns the key itself, return the fallback
    return translated === translationKey ? fallback : translated;
  };

  // Filter expenses based on search term
  const filteredExpenses = expenses.filter((expense) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    // Include translated category/method in search if needed
    return (
      expense.vendor.toLowerCase().includes(term) ||
      (expense.notes && expense.notes.toLowerCase().includes(term)) ||
      expense.amount.toString().includes(term) ||
      formatDisplayString(expense.category, 'expenses', 'categoryOptions', expense.category).toLowerCase().includes(term) ||
      formatDisplayString(expense.paymentMethod, 'donations', 'methods', expense.paymentMethod).toLowerCase().includes(term)
    )
  })

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredExpenses.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / itemsPerPage))

  // Helper to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency: "USD", // TODO: Make dynamic
    }).format(amount)
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('expenses:title')}</h1>
        <p className="text-muted-foreground">{t('expenses:expensesContent.subtitle')}</p>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t('expenses:expensesContent.recordsTitle')}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{t('expenses:expensesContent.recordsSubtitle')}</p>
          </div>
          <Button onClick={handleNewExpenseClick} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('expenses:newExpense')}
          </Button>
        </div>

        <div className="p-4">
          <div className="relative w-full max-w-sm mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('expenses:expensesContent.searchPlaceholder')}
              className="w-full rounded-md pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(itemsPerPage)].map((_, i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded-md"></div>
              ))}
            </div>
          ) : filteredExpenses.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('expenses:date')}</TableHead>
                    <TableHead>{t('expenses:vendor')}</TableHead>
                    <TableHead>{t('expenses:category')}</TableHead>
                    <TableHead>{t('expenses:paymentMethod')}</TableHead>
                    <TableHead className="text-right">{t('expenses:amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((expense) => (
                    <TableRow
                      key={expense.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewExpenseDetails(expense)}
                    >
                      <TableCell>{format(new Date(expense.date), "PP")}</TableCell>
                      <TableCell>{expense.vendor}</TableCell>
                      <TableCell>{formatDisplayString(expense.category, 'expenses', 'categoryOptions', expense.category)}</TableCell>
                      <TableCell>{formatDisplayString(expense.paymentMethod, 'donations', 'methods', expense.paymentMethod)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
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
                  onItemsPerPageChange={(items) => { setCurrentPage(1); setItemsPerPage(items); }}
                />
              </div>
            </>
          ) : (
            <div className="flex min-h-[300px] items-center justify-center rounded-md border border-dashed p-4 sm:p-8 text-center">
              <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                <h3 className="mt-4 text-lg font-semibold">{t('expenses:expensesContent.empty.title')}</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">
                  {searchTerm 
                    ? t('expenses:expensesContent.empty.adjustSearch')
                    : t('expenses:expensesContent.empty.addFirst')}
                </p>
                <Button onClick={handleNewExpenseClick}>{t('expenses:newExpense')}</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <NewExpenseModal 
        isOpen={showModal} 
        onClose={handleModalClose} 
        expenseToEdit={selectedExpense ? {...selectedExpense, notes: selectedExpense.notes || ''} : undefined} 
      />
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

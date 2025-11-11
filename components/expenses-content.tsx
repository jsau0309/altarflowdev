"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { Search, Plus, CreditCard, Calendar as CalendarIcon, Filter, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { NewExpenseModal } from "@/components/modals/new-expense-modal"
import { ExpenseDetailsDrawer } from "./expenses/expense-details-drawer"
import { TablePagination } from "@/components/ui/table-pagination"
import { useTranslation } from 'react-i18next'
import type { Expense } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { useToast } from "@/components/ui/use-toast";
import { toast as sonnerToast } from 'sonner';
import LoaderOne from "@/components/ui/loader-one";

type ExpenseWithCategory = Expense & {
  ExpenseCategory?: {
    id: string;
    name: string;
    color: string;
  } | null;
};

interface DateRange {
  from: Date | null
  to: Date | null
}

export function ExpensesContent() {
  const { getToken } = useAuth()
  const { organization } = useOrganization()
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [showExpenseDetails, setShowExpenseDetails] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)
  const [userRole, setUserRole] = useState<"ADMIN" | "STAFF" | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { t, i18n } = useTranslation(['expenses', 'donations', 'common', 'reports', 'settings'])
  const { toast } = useToast()

  // Helper function to translate system category names
  const getTranslatedCategoryName = (categoryName: string): string => {
    const key = `settings:systemCategories.expenseCategories.${categoryName}`;
    const translated = t(key, categoryName);
    return translated === key ? categoryName : translated;
  };

  // Get category display with fallback to legacy field
  const getCategoryDisplay = (expense: ExpenseWithCategory) => {
    if (expense.ExpenseCategory) {
      return getTranslatedCategoryName(expense.ExpenseCategory.name);
    }
    if (expense.category) {
      return getTranslatedCategoryName(expense.category);
    }
    return '-';
  };

  // Date filter state
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()), // First day of current month
    to: endOfMonth(new Date()) // Last day of current month
  })
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [tempDateRange, setTempDateRange] = useState<DateRange>(dateRange)
  // const [isFilterLoading, setIsFilterLoading] = useState(false) // Not needed for expenses

  // Category filter state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [expenseCategories, setExpenseCategories] = useState<Array<{ id: string; name: string; color: string }>>([])

  // Sort state
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc') // Default to newest first

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/expenses');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch expenses');
      }
      const data = await response.json();
      setExpenses(data as Expense[]);
    } catch (err) {
      console.error("API fetch error:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUserRole = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  }, [getToken]);

  const fetchExpenseCategories = useCallback(async () => {
    if (!organization?.id) return;

    try {
      const response = await fetch(`/api/churches/${organization.id}/expense-categories`);

      if (response.ok) {
        const data = await response.json();
        setExpenseCategories(data);
      }
    } catch (error) {
      console.error("Error fetching expense categories:", error);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchExpenses();
    fetchUserRole();
    fetchExpenseCategories();
  }, [fetchExpenses, fetchUserRole, fetchExpenseCategories]);

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
      });
    }
  }, [error, toast]);

  const handleNewExpenseClick = () => {
    setSelectedExpense(null)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setSelectedExpense(null)
    fetchExpenses();
  }

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense)
    setShowModal(true)
  }

  const handleDeleteExpense = async (expenseId: string) => {
    // Check if user is admin first
    if (userRole !== "ADMIN") {
      sonnerToast.error(t('expenses:detailsDrawer.permissionDenied'), {
        description: t('expenses:detailsDrawer.permissionDeniedDescription'),
      });
      return;
    }

    // Prevent multiple delete attempts
    if (deletingId) return;

    setDeletingId(expenseId);
    const loadingToast = sonnerToast.loading(t('expenses:detailsDrawer.deleting'));

    try {
      const token = await getToken();
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok || response.status === 204) {
        // Update expenses list immediately for better UX
        setExpenses(prev => prev.filter(exp => exp.id !== expenseId));

        sonnerToast.dismiss(loadingToast);
        sonnerToast.success(t('expenses:detailsDrawer.deleteSuccess'));

        // Refresh expenses in background
        fetchExpenses();
      } else {
        sonnerToast.dismiss(loadingToast);

        // Handle specific error cases
        if (response.status === 403) {
          sonnerToast.error(t('expenses:detailsDrawer.permissionDenied'), {
            description: t('expenses:detailsDrawer.permissionDeniedDescription'),
          });
        } else if (response.status === 404) {
          sonnerToast.error(t('expenses:detailsDrawer.expenseNotFound'), {
            description: t('expenses:detailsDrawer.expenseNotFoundDescription'),
          });
          // Refresh the list since it might be out of sync
          fetchExpenses();
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || t('expenses:detailsDrawer.deleteError'));
        }
        return;
      }
    } catch (err) {
      console.error("Delete expense error:", err);
      sonnerToast.dismiss(loadingToast);
      sonnerToast.error(t('expenses:detailsDrawer.deleteError'), {
        description: t('expenses:detailsDrawer.deleteErrorDescription'),
      });
    } finally {
      setDeletingId(null);
      // Close drawer and clear selection
      setShowExpenseDetails(false);
      setSelectedExpense(null);
    }
  };

  const handleViewExpenseDetails = (expense: Expense) => {
    setSelectedExpense(expense)
    setShowExpenseDetails(true)
  }

  const filteredExpenses = expenses.filter((expense) => {
    // Date filter
    if (dateRange.from && dateRange.to) {
      const expenseDate = new Date(expense.expenseDate)
      // Create dates at start and end of day for proper comparison
      const startOfDay = new Date(dateRange.from)
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(dateRange.to)
      endOfDay.setHours(23, 59, 59, 999)

      // Compare dates without timezone adjustment
      if (expenseDate < startOfDay || expenseDate > endOfDay) {
        return false
      }
    }

    // Category filter
    if (selectedCategoryId && expense.ExpenseCategory?.id !== selectedCategoryId) {
      return false
    }

    // Search filter
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    const categoryName = getCategoryDisplay(expense).toLowerCase();
    return (
      expense.vendor?.toLowerCase().includes(term) ||
      expense.description?.toLowerCase().includes(term) ||
      expense.amount.toString().includes(term) ||
      categoryName.includes(term)
    )
  })

  // Sort expenses by date
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    const dateA = new Date(a.expenseDate).getTime()
    const dateB = new Date(b.expenseDate).getTime()
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
  })

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = sortedExpenses.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.max(1, Math.ceil(sortedExpenses.length / itemsPerPage))

  // Calculate total of current page items
  const currentPageTotal = currentItems.reduce((sum, expense) => {
    const amount = typeof expense.amount === 'number'
      ? expense.amount
      : typeof expense.amount === 'string'
      ? parseFloat(expense.amount)
      : (expense.amount as Decimal).toNumber()
    return sum + (isNaN(amount) ? 0 : amount)
  }, 0)

  const formatCurrency = (amount: number | Decimal | string | null | undefined) => {
    // Debug logging removed: formatting currency value
    if (amount === null || amount === undefined) return '-';

    let numericAmount: number;
    if (typeof amount === 'number') {
      numericAmount = amount;
    } else if (typeof amount === 'string') {
      numericAmount = parseFloat(amount);
    } else if (typeof amount === 'object' && amount !== null && 'toNumber' in amount && typeof amount.toNumber === 'function') {
      // Handle Decimal object case (less likely after JSON serialization, but good practice)
      numericAmount = (amount as Decimal).toNumber();
    } else {
      // Log error for unexpected types and fallback
      console.error("Unexpected type for amount in formatCurrency:", typeof amount, amount);
      return '-'; 
    }

    // Check if parsing failed
    if (isNaN(numericAmount)) {
        console.error("Failed to parse amount in formatCurrency:", amount);
        return '-';
    }

    return new Intl.NumberFormat('en-US', {
      style: "currency",
      currency: "USD",
    }).format(numericAmount)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
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
          
          <div className="flex gap-2">
            {/* Category Filter */}
            <Select
              value={selectedCategoryId || "all"}
              onValueChange={(value) => setSelectedCategoryId(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('expenses:filterByCategory', 'Filter by category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('expenses:allCategories', 'All Categories')}</SelectItem>
                {expenseCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {getTranslatedCategoryName(category.name)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Popover open={isFilterOpen} onOpenChange={(open) => {
              if (open) setTempDateRange(dateRange)
              setIsFilterOpen(open)
            }}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <Filter className="mr-2 h-4 w-4" />
                  {(() => {
                    if (!dateRange.from || !dateRange.to) return t('reports:selectDateRange')
                    
                    // If selecting a whole month (first day to last day of same month)
                    const fromDate = dateRange.from
                    const toDate = dateRange.to
                    
                    if (fromDate.getMonth() === toDate.getMonth() && 
                        fromDate.getFullYear() === toDate.getFullYear() &&
                        fromDate.getDate() === 1) {
                      // Check if toDate is the last day of the month
                      const lastDayOfMonth = new Date(toDate.getFullYear(), toDate.getMonth() + 1, 0)
                      if (toDate.getDate() === lastDayOfMonth.getDate()) {
                        return format(fromDate, 'MMMM yyyy')
                      }
                    }
                    
                    return `${format(fromDate, 'MMM d')} - ${format(toDate, 'MMM d, yyyy')}`
                  })()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">{t('reports:dateRange')}</h4>
                    
                    {/* Quick month selection */}
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const now = new Date()
                          setTempDateRange({
                            from: startOfMonth(now),
                            to: endOfMonth(now)
                          })
                        }}
                      >
                        {t('reports:timeFrames.thisMonth')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const lastMonth = subMonths(new Date(), 1)
                          setTempDateRange({
                            from: startOfMonth(lastMonth),
                            to: endOfMonth(lastMonth)
                          })
                        }}
                      >
                        {t('reports:timeFrames.lastMonth')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const now = new Date()
                          const yearStart = new Date(now.getFullYear(), 0, 1)
                          setTempDateRange({
                            from: yearStart,
                            to: now
                          })
                        }}
                      >
                        YTD
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm text-muted-foreground">{t('common:from')}</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !tempDateRange.from && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {tempDateRange.from ? format(tempDateRange.from, "PPP") : t('reports:pickDate')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={tempDateRange.from || undefined}
                              onSelect={(date) => setTempDateRange(prev => ({ ...prev, from: date || null }))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div>
                        <label className="text-sm text-muted-foreground">{t('common:to')}</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !tempDateRange.to && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {tempDateRange.to ? format(tempDateRange.to, "PPP") : t('reports:pickDate')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={tempDateRange.to || undefined}
                              onSelect={(date) => setTempDateRange(prev => ({ ...prev, to: date || null }))}
                              initialFocus
                              disabled={(date) => tempDateRange.from ? date < tempDateRange.from : false}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const defaultRange = {
                          from: startOfMonth(new Date()),
                          to: endOfMonth(new Date())
                        }
                        setTempDateRange(defaultRange)
                        setDateRange(defaultRange)
                        setIsFilterOpen(false)
                      }}
                    >
                      {t('common:reset')}
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setDateRange(tempDateRange)
                        setIsFilterOpen(false)
                      }}
                    >
                      {t('common:apply')}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            <Button onClick={handleNewExpenseClick} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('expenses:newExpense')}
            </Button>
          </div>
        </div>

        <div className="p-4">
          <div className="relative w-full mb-4">
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
            <div className="flex justify-center items-center h-[500px]">
              <LoaderOne />
            </div>
          ) : filteredExpenses.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        {t('expenses:date')}
                        <ArrowUpDown className="h-4 w-4" />
                      </button>
                    </TableHead>
                    <TableHead>{t('expenses:vendor')}</TableHead>
                    <TableHead>{t('expenses:category')}</TableHead>
                    <TableHead className="text-right">{t('expenses:amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((expense) => {
                    // Display date without timezone adjustment to match filtering
                    const expenseDate = new Date(expense.expenseDate);
                    
                    return (
                      <TableRow key={expense.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewExpenseDetails(expense)}>
                        <TableCell>{format(expenseDate, "PP")}</TableCell>
                        <TableCell>{expense.vendor || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {expense.ExpenseCategory?.color && (
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: expense.ExpenseCategory.color }}
                              />
                            )}
                            <span>{getCategoryDisplay(expense)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{t('expenses:pageTotal', 'Page Total')}:</span>{' '}
                  <span className="font-semibold text-foreground">{formatCurrency(currentPageTotal)}</span>
                </div>
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={sortedExpenses.length}
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

      <NewExpenseModal 
        isOpen={showModal} 
        onClose={handleModalClose} 
        expenseToEdit={selectedExpense ?? undefined}
      />
      <ExpenseDetailsDrawer
        expense={selectedExpense}
        open={showExpenseDetails}
        onClose={() => setShowExpenseDetails(false)}
        onEdit={() => selectedExpense && handleEditExpense(selectedExpense)}
        onDelete={() => selectedExpense && handleDeleteExpense(selectedExpense.id)}
        userRole={userRole}
        isDeleting={deletingId === selectedExpense?.id}
      />
    </div>
  )
}

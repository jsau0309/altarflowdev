"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@clerk/nextjs"
import { Search, Plus, CreditCard, Calendar as CalendarIcon, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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

interface DateRange {
  from: Date | null
  to: Date | null
}

export function ExpensesContent() {
  const { getToken } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
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
  const { t, i18n } = useTranslation(['expenses', 'donations', 'common', 'reports'])
  const { toast } = useToast()
  
  // Date filter state
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
    to: new Date() // Today
  })
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [tempDateRange, setTempDateRange] = useState<DateRange>(dateRange)
  // const [isFilterLoading, setIsFilterLoading] = useState(false) // Not needed for expenses

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

  useEffect(() => {
    fetchExpenses();
    fetchUserRole();
  }, [fetchExpenses, fetchUserRole]);

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
      sonnerToast.error("Permission denied", {
        description: "Only administrators can delete expenses.",
      });
      return;
    }

    // Prevent multiple delete attempts
    if (deletingId) return;

    setDeletingId(expenseId);
    const loadingToast = sonnerToast.loading("Deleting expense...");

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
        sonnerToast.success("Expense deleted successfully!"); 
        
        // Refresh expenses in background
        fetchExpenses();
      } else {
        sonnerToast.dismiss(loadingToast);
        
        // Handle specific error cases
        if (response.status === 403) {
          sonnerToast.error("Permission denied", {
            description: "Only administrators can delete expenses. Please contact your admin.",
          });
        } else if (response.status === 404) {
          sonnerToast.error("Expense not found", {
            description: "This expense may have already been deleted.",
          });
          // Refresh the list since it might be out of sync
          fetchExpenses();
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to delete expense");
        }
        return;
      }
    } catch (err) {
      console.error("Delete expense error:", err);
      sonnerToast.dismiss(loadingToast);
      sonnerToast.error("Failed to delete expense", {
        description: "Please try again later.",
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

  const formatDisplayString = (key: string | null | undefined, namespace: 'expenses' | 'donations', prefix: string, fallback: string) => {
    const validKey = key || '';
    const formattedKey = validKey.toLowerCase().replace(/\s+|-/g, '') || '';
    if (!formattedKey) return fallback;
    const translationKey = `${namespace}:${prefix}.${formattedKey}`;
    const translated = t(translationKey, fallback);
    return translated === translationKey ? fallback : translated;
  };

  const filteredExpenses = expenses.filter((expense) => {
    // Date filter
    if (dateRange.from && dateRange.to) {
      const expenseDate = new Date(expense.expenseDate)
      // Adjust for timezone
      const adjustedDate = new Date(expenseDate.valueOf() + expenseDate.getTimezoneOffset() * 60 * 1000)
      
      if (!isWithinInterval(adjustedDate, { start: dateRange.from, end: dateRange.to })) {
        return false
      }
    }
    
    // Search filter
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      expense.vendor?.toLowerCase().includes(term) ||
      expense.description?.toLowerCase().includes(term) ||
      expense.amount.toString().includes(term) ||
      formatDisplayString(expense.category, 'expenses', 'categoryOptions', expense.category).toLowerCase().includes(term)
    )
  })

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredExpenses.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / itemsPerPage))

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

    return new Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency: "USD", // Consider making currency dynamic if needed
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
                          from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                          to: new Date()
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
                    <TableHead>{t('expenses:date')}</TableHead>
                    <TableHead>{t('expenses:vendor')}</TableHead>
                    <TableHead>{t('expenses:category')}</TableHead>
                    <TableHead className="text-right">{t('expenses:amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((expense) => {
                    // Adjust date for display based on timezone offset
                    const dateUtc = new Date(expense.expenseDate); // Parse the UTC date string
                    // getTimezoneOffset returns diff in minutes (e.g., 300 for UTC-5). We need to *add* this offset back to UTC time.
                    const adjustedDate = new Date(dateUtc.valueOf() + dateUtc.getTimezoneOffset() * 60 * 1000);
                    
                    return (
                      <TableRow key={expense.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewExpenseDetails(expense)}>
                        <TableCell>{format(adjustedDate, "PP")}</TableCell>
                        <TableCell>{expense.vendor || '-'}</TableCell>
                        <TableCell>{formatDisplayString(expense.category, 'expenses', 'categoryOptions', expense.category)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                      </TableRow>
                    );
                  })}
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

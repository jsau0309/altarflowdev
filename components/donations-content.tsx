"use client"

import { useState, useEffect } from "react"
import { Filter, Plus, Users, X, DollarSign, Edit3, Lock, ArrowLeft, Calendar as CalendarIcon, Globe, ArrowUpDown, Search } from "lucide-react"
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { NewDonorModal } from "@/components/modals/new-donor-modal";
import { EditDonorModal } from "@/components/modals/edit-donor-modal"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getDonationTransactions } from "@/lib/actions/donations.actions";
import LoaderOne from "@/components/ui/loader-one";
import { getDonors } from "@/lib/actions/donors.actions";
import { DonorsTable } from "@/components/donors-table";
import { DonationDetailsDrawer } from "@/components/donations/donation-details-drawer";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils"
import { DonorDetailsDrawer } from "@/components/donations/donor-details-drawer";
import { TablePagination } from "@/components/ui/table-pagination";
import { safeStorage } from "@/lib/safe-storage";
import { DonorFE, DonationTransactionFE, DonorDetailsData } from "@/lib/types";
import { useTranslation } from 'react-i18next';
import { ManualDonationDialog } from "@/components/modals/manual-donation-dialog";


interface DonationsContentProps {
  propDonationTypes: string[]; // Changed from propDonors to propDonationTypes
}

export default function DonationsContent({ propDonationTypes }: DonationsContentProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDonorModal, setShowDonorModal] = useState(false)
  const [activeTab, setActiveTab] = useState("all-donations")
  const [campaignsView, setCampaignsView] = useState<'list' | 'create' | { mode: 'edit', id: string }>('list')
  const [donorSearchTerm, setDonorSearchTerm] = useState("")
  const [donationSearchTerm, setDonationSearchTerm] = useState("")
  const [showEditDonorModal, setShowEditDonorModal] = useState(false)
  const [selectedDonationId, setSelectedDonationId] = useState<string | null>(null)
  const [showDonationDetails, setShowDonationDetails] = useState(false)
  const [showDonorDetails, setShowDonorDetails] = useState(false);

  const [selectedDonorIdForDetails, setSelectedDonorIdForDetails] = useState<string | null>(null)
  const [selectedDonorObjectForModal, setSelectedDonorObjectForModal] = useState<DonorDetailsData | null>(null)

  // Date range state for the date filter button
  interface DateRangeState {
    from: Date | null
    to: Date | null
  }
  const [dateRange, setDateRange] = useState<DateRangeState>({
    from: startOfMonth(new Date()), // First day of current month
    to: endOfMonth(new Date()) // Last day of current month
  })
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false)
  const [tempDateRange, setTempDateRange] = useState<DateRangeState>(dateRange)

  const [selectedDonationMethods, setSelectedDonationMethods] = useState<string[]>([])
  const [selectedDonationTypes, setSelectedDonationTypes] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  // Temporary state for filter selections (before applying)
  const [tempDonationMethods, setTempDonationMethods] = useState<string[]>([])
  const [tempDonationTypes, setTempDonationTypes] = useState<string[]>([])
  const [tempStatuses, setTempStatuses] = useState<string[]>([])
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // State for fetched payment methods (for filter dropdown)
  const [paymentMethods, setPaymentMethods] = useState<Array<{ id: string; name: string; color: string }>>([])

  const [donations, setDonations] = useState<DonationTransactionFE[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalItems, setTotalItems] = useState(0);
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // State for donors tab
  const [donors, setDonors] = useState<DonorFE[]>([]);
  const [isDonorsLoading, setIsDonorsLoading] = useState(true);
  const [donorsCurrentPage, setDonorsCurrentPage] = useState(1);
  const [donorsItemsPerPage, setDonorsItemsPerPage] = useState(10);
  const [donorsTotalItems, setDonorsTotalItems] = useState(0);
  const donorsTotalPages = Math.ceil(donorsTotalItems / donorsItemsPerPage);
  const { t } = useTranslation(['donations', 'common', 'expenses', 'members'])

  const fetchDonors = async () => {
    setIsDonorsLoading(true);
    try {
      const data = await getDonors({
        page: donorsCurrentPage,
        limit: donorsItemsPerPage,
        query: donorSearchTerm,
      });
      if (data.donors) {
        setDonors(data.donors);
        setDonorsTotalItems(data.totalDonors);
      } else {
        setDonors([]);
        setDonorsTotalItems(0);
      }
    } catch (error) {
      console.error("Failed to fetch donors:", error);
      setDonors([]);
      setDonorsTotalItems(0);
    } finally {
      setIsDonorsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'donors') {
      fetchDonors();
    }
  }, [activeTab, donorsCurrentPage, donorsItemsPerPage, donorSearchTerm]);

  // Fetch payment methods for filter dropdown
  const fetchPaymentMethods = async () => {
    try {
      const churchId = safeStorage.getItem("churchId");
      if (!churchId) return;

      const response = await fetch(`/api/churches/${churchId}/donation-payment-methods`);
      if (!response.ok) throw new Error("Failed to fetch payment methods");

      const data = await response.json();
      setPaymentMethods(data);
    } catch (error) {
      console.error("Failed to fetch payment methods:", error);
      setPaymentMethods([]);
    }
  };

  // Fetch payment methods on mount
  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchDonations = async () => {
    setIsLoading(true)
    const churchIdFromStorage = typeof window !== 'undefined' ? safeStorage.getItem("churchId") : null;

    if (!churchIdFromStorage) {
      console.error("fetchDonations: churchId is not available from localStorage. Cannot fetch donations.");
      toast.error(t('common:error'), {
        description: t('common:errors.churchId_not_found_detail', 'Church identifier is missing. Please ensure you are properly logged in or contact support.'),
      });
      setDonations([]);
      setTotalItems(0);
      setIsLoading(false);
      return;
    }

    try {
      const { donations: fetchedDonations, totalCount: fetchedTotal} = await getDonationTransactions({
        clerkOrgId: churchIdFromStorage,
        page: currentPage,
        limit: itemsPerPage,
        startDate: dateRange.from || undefined,
        endDate: dateRange.to || undefined,
        donationTypes: selectedDonationTypes,
        paymentMethods: selectedDonationMethods,
        donorIds: [], // Donor filter removed
      });
      if (fetchedDonations) {
        setDonations(fetchedDonations)
        setTotalItems(fetchedTotal)
      } else {
        setDonations([])
        setTotalItems(0)
      }
    } catch (error) {
      console.error("Failed to fetch donations:", error)
      setDonations([])
      setTotalItems(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'all-donations') {
      fetchDonations();
    }
  }, [activeTab, currentPage, itemsPerPage, dateRange, selectedDonationTypes, selectedDonationMethods]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get("tab")
      if (tabParam && ["all-donations", "donors", "campaigns"].includes(tabParam)) {
        setActiveTab(tabParam)
      }
    }
  }, [])

  // filteredDonors removed - donor filter removed
  // getDonorName removed - donor filter removed

  const handleNewDonationClick = () => {
    setShowModal(true)
    setActiveTab("all-donations")
  }

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleManualDonationSuccess = () => {
    setShowModal(false);
    toast.success(t('donations:newManualDonation.success_message', 'Donation saved successfully.'));
    setCurrentPage(1); // Reset to first page to show new donation
    fetchDonations(); // Manually refresh donations (also triggers if page unchanged)
    fetchDonors(); // Refresh donors list
  };

  const handleEditDonorFromList = (donor: DonorFE) => {
    const donorDetails: DonorDetailsData = {
      id: donor.id,
      firstName: donor.firstName ?? '',
      lastName: donor.lastName ?? '',
      email: donor.email,
      phone: donor.phone,
      address: donor.address,
      city: donor.city,
      state: donor.state,
      zipCode: donor.zipCode,
      createdAt: donor.createdAt,
      updatedAt: donor.updatedAt,
      churchId: donor.churchId || null,
      memberId: donor.memberId || null,
      linkedMemberName: donor.linkedMemberName || null,
      // Default values for missing fields from DonorDetailsData
            membershipStatus: 'Visitor',
      joinDate: null,
      ministryInvolvement: null,
      smsConsent: false,
      smsConsentDate: null,
      smsConsentMethod: null,
      preferredLanguage: 'en',
      notes: null,
      donations: [],
    };
    setSelectedDonorObjectForModal(donorDetails);
    setShowEditDonorModal(true);
  };

  const handleAddDonorClick = () => {
    setShowDonorModal(true);
  };

  const handleDonorModalClose = () => {
    setShowDonorModal(false);
  };

  const handleDonorCreated = () => {
    setShowDonorModal(false)
    fetchDonors()
    toast.success(t('donations:addDonorModal.toast.success_title'), {
      description: t('donations:addDonorModal.toast.success_description'),
    });
  };

  const handleDonorUpdated = () => {
    fetchDonors();
  };

  const handleEditDonorModalClose = () => {
    setShowEditDonorModal(false);
    setSelectedDonorObjectForModal(null);
  };

  const handleViewDonationDetails = (id: string) => {
    setSelectedDonationId(id);
    setShowDonationDetails(true);
  };

  const handleDonationTypeFilterChange = (type: string) => {
    setTempDonationTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleDonationMethodFilterChange = (method: string) => {
    setTempDonationMethods(prev =>
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    );
  };

  const handleStatusFilterChange = (status: string) => {
    setTempStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const applyFilters = () => {
    setSelectedDonationMethods(tempDonationMethods);
    setSelectedDonationTypes(tempDonationTypes);
    setSelectedStatuses(tempStatuses);
    setIsFilterOpen(false);
  };

  const resetFilters = () => {
    setTempDonationMethods([]);
    setTempDonationTypes([]);
    setTempStatuses([]);
    setSelectedDonationMethods([]);
    setSelectedDonationTypes([]);
    setSelectedStatuses([]);
    setIsFilterOpen(false);
  };

  // Helper function to get status color
  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      'succeeded': '#3B82F6',      // Blue - success
      'completed': '#3B82F6',      // Blue - success (manual)
      'pending': '#94A3B8',        // Gray - waiting
      'processing': '#F59E0B',     // Amber - in progress
      'failed': '#EF4444',         // Red - error
      'refunded': '#8B5CF6',       // Purple - reversed
      'partially_refunded': '#A855F7', // Violet - partial reverse
      'canceled': '#6B7280',       // Gray - canceled
      'disputed': '#DC2626',       // Dark red - disputed
    };
    return statusColors[status] || '#94A3B8'; // Default gray
  };

  // Helper function to get translated status text
  const getTranslatedStatus = (donation: DonationTransactionFE): string => {
    // All succeeded donations (both manual and Stripe) show "Completed"
    if (donation.status === 'succeeded') {
      return t('donations:statuses.completed', 'Completed');
    }

    // Map status to translation key
    const statusKey = donation.status === 'partially_refunded' ? 'partiallyRefunded' : donation.status;
    return t(`donations:statuses.${statusKey}`, donation.status);
  };

  // Helper function to translate donation type names
  // System types (Tithe, Offering) use translation keys
  // Custom campaigns show their custom names as-is
  const getTranslatedDonationTypeName = (typeName: string): string => {
    // Check if it's a system type (Tithe or Offering)
    const systemTypes: Record<string, string> = {
      'Tithe': 'tithe',
      'Offering': 'offering',
    };

    if (systemTypes[typeName]) {
      const key = `donations:types.${systemTypes[typeName]}`;
      return t(key, typeName);
    }

    // For custom campaigns, return the name as-is
    return typeName;
  };

  // Helper function to map Stripe payment method types to display names
  const getStripePaymentMethodDisplayName = (stripeType: string): string => {
    const stripeMethodMap: Record<string, string> = {
      'card': 'Card',
      'us_bank_account': 'Bank Account',
      'link': 'Link',
    };
    return stripeMethodMap[stripeType] || stripeType;
  };

  // Helper function to get translated payment method name
  // For manual donations: Uses Settings namespace for system methods and custom method names
  // For Stripe donations: Maps Stripe types and translates them
  const getTranslatedPaymentMethodName = (donation: DonationTransactionFE): string => {
    // For Stripe donations (no paymentMethodId), use Stripe payment method type
    if (donation.source === 'stripe' && !donation.paymentMethodId) {
      const displayName = getStripePaymentMethodDisplayName(donation.paymentMethodType);
      // Translate Stripe payment methods
      const key = `donations:stripePaymentMethods.${displayName.toLowerCase().replace(' ', '')}`;
      const translated = t(key, displayName);
      return translated === key ? displayName : translated;
    }

    // For manual donations with paymentMethodId, use the payment method name from DonationPaymentMethod table
    if (donation.paymentMethod?.name) {
      // Use the SAME translation namespace as the Settings page
      const key = `settings:systemCategories.paymentMethods.${donation.paymentMethod.name}`;
      const translated = t(key, donation.paymentMethod.name);
      return translated === key ? donation.paymentMethod.name : translated;
    }

    // Fallback to raw paymentMethodType
    return donation.paymentMethodType;
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedDonationMethods.length > 0) count++;
    if (selectedDonationTypes.length > 0) count++;
    if (selectedStatuses.length > 0) count++;
    return count;
  };

  const renderFilterBadges = () => {
    const badges = [];

    // Date badge removed - now shown in separate date filter button

    if (selectedDonationTypes.length > 0) {
      badges.push(
        <Badge key="types" variant="secondary" className="flex items-center gap-1">
          {t('donations:type', 'Type')}: {selectedDonationTypes.join(', ')}
          <button onClick={() => setSelectedDonationTypes([])} className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      );
    }

    if (selectedDonationMethods.length > 0) {
      badges.push(
        <Badge key="methods" variant="secondary" className="flex items-center gap-2">
          {t('donations:method', 'Method')}: {selectedDonationMethods.join(', ')}
          <button onClick={() => setSelectedDonationMethods([])} className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      );
    }

    // Donor filter removed - only showed manual donors, not universal donors

    return badges;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            {t('donations:title', 'Donations')}
          </h2>
          <p className="text-muted-foreground">
            {t('donations:donationsContent.subtitle', 'Track and manage your church donations')}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all-donations">{t('donations:donationsContent.tabs.allDonations', 'All Donations')}</TabsTrigger>
          <TabsTrigger value="donors">{t('donations:donor', 'Donors')}</TabsTrigger>
          <TabsTrigger value="campaigns">{t('donations:donationsContent.tabs.campaigns', 'Donation Campaigns')}</TabsTrigger>
        </TabsList>

        <TabsContent value="all-donations">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {t('donations:donationsContent.allDonations.title', 'All Donations')}
                </CardTitle>
                <CardDescription>
                  {t('donations:donationsContent.allDonations.description', 'View, search, and filter all donations')}
                </CardDescription>
              </div>
              
              <div className="flex gap-2">
                {/* Date Filter - Matches Expenses page pattern */}
                <Popover open={isDateFilterOpen} onOpenChange={(open) => {
                  if (open) setTempDateRange(dateRange)
                  setIsDateFilterOpen(open)
                }}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {(() => {
                        if (!dateRange.from || !dateRange.to) return t('reports:selectDateRange', 'Select Date Range')

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
                        <h4 className="font-medium text-sm">{t('reports:dateRange', 'Date Range')}</h4>

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
                            {t('reports:timeFrames.thisMonth', 'This Month')}
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
                            {t('reports:timeFrames.lastMonth', 'Last Month')}
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
                            <label className="text-sm text-muted-foreground">{t('common:from', 'From')}</label>
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
                                  {tempDateRange.from ? format(tempDateRange.from, "PPP") : t('reports:pickDate', 'Pick a date')}
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
                            <label className="text-sm text-muted-foreground">{t('common:to', 'To')}</label>
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
                                  {tempDateRange.to ? format(tempDateRange.to, "PPP") : t('reports:pickDate', 'Pick a date')}
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
                            setIsDateFilterOpen(false)
                          }}
                        >
                          {t('common:reset', 'Reset')}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setDateRange(tempDateRange)
                            setIsDateFilterOpen(false)
                          }}
                        >
                          {t('common:apply', 'Apply')}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Other Filters (Type, Method, Status) */}
                <Popover open={isFilterOpen} onOpenChange={(open) => {
                  if (open) {
                    // Initialize temp state with current filter values
                    setTempDonationMethods(selectedDonationMethods);
                    setTempDonationTypes(selectedDonationTypes);
                    setTempStatuses(selectedStatuses);
                  }
                  setIsFilterOpen(open);
                }}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      {t('donations:donationsContent.filter.title', 'Filter Donations')}
                      {getActiveFilterCount() > 0 && <Badge>{getActiveFilterCount()}</Badge>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <div className="p-4 space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">{t('donations:donationsContent.filter.title', 'Filter Donations')}</h4>
                        <div className="space-y-4">
                          {/* Type Filter */}
                          <div className="space-y-2">
                            <Label>{t('donations:type', 'Type')}</Label>
                            <ScrollArea className="max-h-[200px]">
                              <div className="space-y-1 pr-4">
                                {propDonationTypes.map((typeName) => (
                                  <div key={typeName} className="flex items-center gap-2">
                                    <Checkbox
                                      id={`type-${typeName}`}
                                      checked={tempDonationTypes.includes(typeName)}
                                      onCheckedChange={() => handleDonationTypeFilterChange(typeName)}
                                    />
                                    <Label htmlFor={`type-${typeName}`} className="cursor-pointer">
                                      {getTranslatedDonationTypeName(typeName)}
                                    </Label>
                                  </div>
                                ))}
                                {propDonationTypes.length === 0 && (
                                  <p className="text-sm text-muted-foreground">{t('common:noOptions', 'No options available')}</p>
                                )}
                              </div>
                            </ScrollArea>
                          </div>

                          {/* Method Filter */}
                          <div className="space-y-2">
                            <Label>{t('donations:method', 'Method')}</Label>
                            <ScrollArea className="max-h-[200px]">
                              <div className="space-y-1 pr-4">
                                {paymentMethods.map((method) => (
                                  <div key={method.id} className="flex items-center gap-2">
                                    <Checkbox
                                      id={`method-${method.id}`}
                                      checked={tempDonationMethods.includes(method.name)}
                                      onCheckedChange={() => handleDonationMethodFilterChange(method.name)}
                                    />
                                    <Label htmlFor={`method-${method.id}`} className="cursor-pointer flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: method.color }} />
                                      {t(`settings:systemCategories.paymentMethods.${method.name}`, method.name)}
                                    </Label>
                                  </div>
                                ))}
                                {paymentMethods.length === 0 && (
                                  <p className="text-sm text-muted-foreground">{t('common:noOptions', 'No options available')}</p>
                                )}
                              </div>
                            </ScrollArea>
                          </div>

                          {/* Status Filter */}
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <ScrollArea className="max-h-[200px]">
                              <div className="space-y-1 pr-4">
                                {['succeeded', 'pending', 'processing', 'failed', 'refunded', 'canceled', 'disputed'].map((status) => (
                                  <div key={status} className="flex items-center gap-2">
                                    <Checkbox
                                      id={`status-${status}`}
                                      checked={tempStatuses.includes(status)}
                                      onCheckedChange={() => handleStatusFilterChange(status)}
                                    />
                                    <Label htmlFor={`status-${status}`} className="cursor-pointer flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusColor(status) }} />
                                      {status === 'succeeded' ? t('donations:statuses.completed', 'Completed') : t(`donations:statuses.${status}`, status)}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetFilters}
                        >
                          {t('common:reset', 'Reset')}
                        </Button>
                        <Button
                          size="sm"
                          onClick={applyFilters}
                        >
                          {t('common:apply', 'Apply')}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Button onClick={handleNewDonationClick} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {t('donations:newDonation', 'New Donation')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('donations:donationsContent.allDonations.searchPlaceholder', 'Search donations (donor, campaign, amount...)')}
                  value={donationSearchTerm}
                  onChange={(e) => setDonationSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {getActiveFilterCount() > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  {renderFilterBadges()}
                </div>
              )}

              {isLoading ? (
                <div className="flex justify-center items-center h-[500px]">
                  <LoaderOne />
                </div>
              ) : (
                <>
                  {(() => {
                    // Filter donations based on search term
                    const filteredDonations = donations.filter((donation) => {
                      if (!donationSearchTerm) return true;
                      const searchLower = donationSearchTerm.toLowerCase();
                      return (
                        donation.donorName?.toLowerCase().includes(searchLower) ||
                        donation.donationTypeName?.toLowerCase().includes(searchLower) ||
                        donation.amount?.toString().includes(searchLower) ||
                        donation.donorEmail?.toLowerCase().includes(searchLower)
                      );
                    });

                    // Calculate total from filtered donations
                    const filteredTotal = filteredDonations.reduce((sum, donation) => sum + parseFloat(donation.amount), 0);

                    return filteredDonations.length > 0 ? (
                      <>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>
                                  <button
                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                                  >
                                    {t('donations:date', 'Date')}
                                    <ArrowUpDown className="h-4 w-4" />
                                  </button>
                                </TableHead>
                                <TableHead>{t('donations:donor', 'Donor')}</TableHead>
                                <TableHead>{t('donations:method', 'Method')}</TableHead>
                                <TableHead>{t('donations:type', 'Type')}</TableHead>
                                <TableHead>{t('donations:amount', 'Amount')}</TableHead>
                                <TableHead className="min-w-[150px]">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {[...filteredDonations]
                                .sort((a, b) => {
                                  const dateA = new Date(a.transactionDate).getTime()
                                  const dateB = new Date(b.transactionDate).getTime()
                                  return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
                                }).map((donation) => {
                              // Check if donation is editable (manual and within 24 hours)
                              const isManual = donation.source === 'manual';
                              // Use processedAt if available, otherwise use transactionDate
                              const referenceDate = donation.processedAt || donation.transactionDate;
                              const createdAt = new Date(referenceDate);
                              const now = new Date();
                              const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
                              const isEditable = isManual && hoursSinceCreation <= 24;
                              
                              return (
                                <TableRow key={donation.id} onClick={() => handleViewDonationDetails(donation.id)} className="cursor-pointer">
                                  <TableCell>{format(parseISO(donation.transactionDate), 'PP')}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1.5">
                                      {donation.isAnonymous
                                        ? `Anonymous${donation.isInternational && donation.donorCountry ? ` (${donation.donorCountry})` : ''}`
                                        : donation.donorName}
                                      {donation.isInternational && !donation.isAnonymous && donation.donorCountry && (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Globe className="h-3.5 w-3.5 text-blue-600" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>{donation.donorCountry}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {donation.status === 'canceled' || donation.status === 'pending' ? (
                                      // Show two dashes close together for canceled/pending transactions
                                      <div className="flex items-center gap-0.5">
                                        <span className="text-muted-foreground">-</span>
                                        <span className="text-muted-foreground">-</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        {/* Show color indicator based on source */}
                                        {donation.source === 'stripe' ? (
                                          // Stripe donations: black (light mode) / white (dark mode) circle
                                          <div className="w-3 h-3 rounded-full bg-foreground" />
                                        ) : (
                                          // Manual donations: show color from DonationPaymentMethod table
                                          donation.paymentMethod?.color && (
                                            <div
                                              className="w-3 h-3 rounded-full"
                                              style={{ backgroundColor: donation.paymentMethod.color }}
                                            />
                                          )
                                        )}
                                        {/* Display payment method name with proper translation */}
                                        {getTranslatedPaymentMethodName(donation)}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell>{getTranslatedDonationTypeName(donation.donationTypeName)}</TableCell>
                                  <TableCell>${parseFloat(donation.amount).toFixed(2)}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {/* Status indicator with colored circle */}
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-3 h-3 rounded-full"
                                          style={{ backgroundColor: getStatusColor(donation.status) }}
                                        />
                                        <span className="text-sm">{getTranslatedStatus(donation)}</span>
                                      </div>

                                      {/* Show dispute status badge if there's an active dispute */}
                                      {donation.disputeStatus && (
                                        <Badge
                                          variant={
                                            donation.disputeStatus === 'won' ? 'default' :
                                            donation.disputeStatus === 'lost' ? 'destructive' :
                                            donation.disputeStatus === 'needs_response' ? 'destructive' :
                                            'outline'
                                          }
                                          className="text-xs"
                                        >
                                          {donation.disputeStatus === 'needs_response' ? '⚠️ Response Needed' :
                                           donation.disputeStatus === 'under_review' ? '🔍 Under Review' :
                                           donation.disputeStatus === 'won' ? '✅ Won' :
                                           donation.disputeStatus === 'lost' ? '❌ Lost' :
                                           donation.disputeStatus}
                                        </Badge>
                                      )}
                                      {isManual && (
                                        isEditable ? (
                                          <div title="Editable">
                                            <Edit3 className="h-3 w-3 text-blue-600" />
                                          </div>
                                        ) : (
                                          <div title="Locked">
                                            <Lock className="h-3 w-3 text-gray-400" />
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{t('donations:pageTotal', 'Total')}:</span>{' '}
                          <span className="font-semibold text-foreground">
                            ${filteredTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <TablePagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          onPageChange={setCurrentPage}
                          onItemsPerPageChange={setItemsPerPage}
                          itemsPerPage={itemsPerPage}
                          totalItems={totalItems}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-20">
                      <div className="rounded-full bg-primary/10 p-4">
                        <DollarSign className="h-10 w-10 text-primary" />
                      </div>
                      <h3 className="mt-6 text-xl font-semibold">{t('donations:donationsContent.empty.title', 'No donations found')}</h3>
                      <p className="mt-2 mb-6 text-sm text-muted-foreground">
                        {getActiveFilterCount() > 0
                          ? t('donations:donationsContent.empty.adjustFilters', 'Try adjusting your search or filters.')
                          : t('donations:donationsContent.empty.addFirst', 'Add your first donation to get started.')}
                      </p>
                      <Button onClick={handleNewDonationClick}>{t('donations:newDonation', 'Add New Donation')}</Button>
                    </div>
                  );
                })()}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="donors">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t('donations:donor', 'Donors')}
                </CardTitle>
                <CardDescription>
                  {t('donations:donorsContent.subtitle', 'Manage your donors')}
                </CardDescription>
              </div>
              <Button onClick={handleAddDonorClick} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t('donations:donorsContent.addDonorButton', 'Add Donor')}
              </Button>
            </CardHeader>
            <CardContent>
              {isDonorsLoading ? (
                <div className="flex justify-center items-center h-[500px]">
                  <LoaderOne />
                </div>
              ) : (
                <>
                  <DonorsTable donors={donors} onEdit={handleEditDonorFromList} onViewDetails={(donorId: string) => {
                    setSelectedDonorIdForDetails(donorId);
                    setShowDonorDetails(true);
                  }} />
                  <div className="mt-4">
                    <TablePagination
                      currentPage={donorsCurrentPage}
                      totalPages={donorsTotalPages}
                      onPageChange={setDonorsCurrentPage}
                      onItemsPerPageChange={setDonorsItemsPerPage}
                      itemsPerPage={donorsItemsPerPage}
                      totalItems={donorsTotalItems}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns">
          {campaignsView === 'list' && (
            <>
              {/* List with inline actions */}
              {/* eslint-disable-next-line @typescript-eslint/no-var-requires */}
              {(() => {
                const CampaignList = require('@/components/donations/campaigns/campaign-list').default;
                return (
                  <CampaignList
                    onNew={() => setCampaignsView('create')}
                    onEdit={(id: string) => setCampaignsView({ mode: 'edit', id })}
                  />
                );
              })()}
            </>
          )}
          {campaignsView === 'create' && (
            <div>
              {(() => {
                const CampaignForm = require('@/components/donations/campaigns/campaign-form').default;
                return (
                  <div className="space-y-4">
                    <Button variant="ghost" size="icon" onClick={() => setCampaignsView('list')} className="h-8 w-8">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <CampaignForm mode="create" onSuccess={() => setCampaignsView('list')} />
                  </div>
                );
              })()}
            </div>
          )}
          {typeof campaignsView === 'object' && campaignsView.mode === 'edit' && (
            <div>
              {(() => {
                const CampaignForm = require('@/components/donations/campaigns/campaign-form').default;
                return (
                  <div className="space-y-4">
                    <Button variant="ghost" size="icon" onClick={() => setCampaignsView('list')} className="h-8 w-8">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <CampaignForm mode="edit" campaignId={campaignsView.id} onSuccess={() => setCampaignsView('list')} />
                  </div>
                );
              })()}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ManualDonationDialog
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={handleManualDonationSuccess}
      />

      <NewDonorModal isOpen={showDonorModal} onClose={handleDonorModalClose} onSuccess={handleDonorCreated} />
      {showEditDonorModal && selectedDonorObjectForModal && (
        <EditDonorModal
          isOpen={showEditDonorModal}
          onClose={handleEditDonorModalClose}
          onSuccess={handleDonorUpdated}
          donor={selectedDonorObjectForModal}
          currentChurchId={selectedDonorObjectForModal?.churchId || null}
        />
      )}
      {selectedDonationId && (
        <DonationDetailsDrawer
          isOpen={showDonationDetails}
          onClose={() => setShowDonationDetails(false)}
          donationId={selectedDonationId}
          onDonationUpdated={() => {
            // Refresh donations list when a donation is edited
            fetchDonations();
          }}
        />
      )}
      {selectedDonorIdForDetails && (
        <DonorDetailsDrawer
          isOpen={showDonorDetails}
          onClose={() => setShowDonorDetails(false)}
          donorId={selectedDonorIdForDetails}
        />
      )}
    </div>
  );
}
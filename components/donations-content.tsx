"use client"

import { useState, useEffect } from "react"
import { Search, Filter, Plus, Users, X, DollarSign, ChevronsUpDown, Check, Edit3, Lock } from "lucide-react"
import { format, parseISO } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getDonationTransactions } from "@/lib/actions/donations.actions";
import LoaderOne from "@/components/ui/loader-one";
import { getDonors } from "@/lib/actions/donors.actions";
import { DonorsTable } from "@/components/donors-table";
import { DonationDetailsDrawer } from "@/components/donations/donation-details-drawer";
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { DonorDetailsDrawer } from "@/components/donations/donor-details-drawer";
import { TablePagination } from "@/components/ui/table-pagination";
import { safeStorage } from "@/lib/safe-storage";
import { DonorFE, DonationTransactionFE, DonorDetailsData } from "@/lib/types";
import { DonorFilterItem } from "@/lib/actions/donations.actions";
import { useTranslation } from 'react-i18next';
import { ManualDonationDialog } from "@/components/modals/manual-donation-dialog";


interface DonationsContentProps {
  propDonors: DonorFilterItem[];
}

export default function DonationsContent({ propDonors }: DonationsContentProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDonorModal, setShowDonorModal] = useState(false)
  const [activeTab, setActiveTab] = useState("all-donations")
  const [donorSearchTerm, setDonorSearchTerm] = useState("")
  const [showEditDonorModal, setShowEditDonorModal] = useState(false)
  const [selectedDonationId, setSelectedDonationId] = useState<string | null>(null)
  const [showDonationDetails, setShowDonationDetails] = useState(false)
  const [showDonorDetails, setShowDonorDetails] = useState(false);

  const [selectedDonorIdForDetails, setSelectedDonorIdForDetails] = useState<string | null>(null)
  const [selectedDonorObjectForModal, setSelectedDonorObjectForModal] = useState<DonorDetailsData | null>(null)

  const [date, setDate] = useState<DateRange | undefined>(undefined)
  const [selectedDonationMethods, setSelectedDonationMethods] = useState<string[]>([])
  const [selectedDonors, setSelectedDonors] = useState<string[]>([])
  const [selectedDonationTypes, setSelectedDonationTypes] = useState<string[]>([])

  const [donations, setDonations] = useState<DonationTransactionFE[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalItems, setTotalItems] = useState(0);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

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
      const { donations: fetchedDonations, totalCount: fetchedTotal } = await getDonationTransactions({
        clerkOrgId: churchIdFromStorage,
        page: currentPage,
        limit: itemsPerPage,
        startDate: date?.from,
        endDate: date?.to,
        donationTypes: selectedDonationTypes,
        paymentMethods: selectedDonationMethods,
        donorIds: selectedDonors,
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
  }, [activeTab, currentPage, itemsPerPage, date, selectedDonationTypes, selectedDonationMethods, selectedDonors]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get("tab")
      if (tabParam && ["all-donations", "donors"].includes(tabParam)) {
        setActiveTab(tabParam)
      }
    }
  }, [])

  const filteredDonors = propDonors.filter((donor: DonorFilterItem) => {
    if (!donorSearchTerm) return true;
    return donor.name.toLowerCase().includes(donorSearchTerm.toLowerCase());
  })

  const getDonorName = (donorId: string) => {
    const donor = propDonors.find((d: DonorFilterItem) => d.id === donorId);
    return donor ? donor.name : t('common:unknownDonor', 'Unknown Donor');
  }

  const handleNewDonationClick = () => {
    setShowModal(true)
    setActiveTab("all-donations")
  }

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleManualDonationSuccess = () => {
    setShowModal(false);
    toast.success(t('donations:createSuccess', 'Donation created successfully!'));
    fetchDonations();
    fetchDonors();
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

  const handleDonorUpdated = (updatedDonor: DonorDetailsData) => {
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
    setSelectedDonationTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleDonationMethodFilterChange = (method: string) => {
    setSelectedDonationMethods(prev =>
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    );
  };


  const handleDonorFilterChange = (donorId: string) => {
    setSelectedDonors(prev =>
      prev.includes(donorId) ? prev.filter(id => id !== donorId) : [...prev, donorId]
    );
  };

  const clearFilters = () => {
    setDate(undefined);
    setSelectedDonationMethods([]);
    setSelectedDonors([]);
    setSelectedDonationTypes([]);
  };

  // Helper function to normalize payment method for translation key
  const getPaymentMethodKey = (method: string) => {
    // Convert various formats to translation keys
    const methodMap: Record<string, string> = {
      'Bank Transfer': 'bankTransfer',
      'banktransfer': 'bankTransfer',  // Handle lowercase no space
      'bankTransfer': 'bankTransfer',  // Handle camelCase
      'Credit/Debit Card': 'card',
      'card': 'card',
      'cash': 'cash',
      'check': 'check',
      'other': 'other',
      'Cash': 'cash',
      'Check': 'check',
      'Other': 'other'
    };
    return methodMap[method] || method;
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (date) count++;
    if (selectedDonationMethods.length > 0) count++;
    if (selectedDonors.length > 0) count++;
    if (selectedDonationTypes.length > 0) count++;
    return count;
  };

  const renderFilterBadges = () => {
    const badges = [];

    if (date) {
      badges.push(
        <Badge key="date" variant="secondary" className="flex items-center gap-1">
          {format(date.from!, 'LLL dd, y')} - {date.to ? format(date.to, 'LLL dd, y') : ''}
          <button onClick={() => setDate(undefined)} className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      );
    }

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
        <Badge key="methods" variant="secondary" className="flex items-center gap-1">
          {t('donations:method', 'Method')}: {selectedDonationMethods.join(', ')}
          <button onClick={() => setSelectedDonationMethods([])} className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      );
    }

    if (selectedDonors.length > 0) {
      badges.push(
        <Badge key="donors" variant="secondary" className="flex items-center gap-1">
          {t('donations:donor', 'Donor')}: {selectedDonors.map(getDonorName).join(', ')}
          <button onClick={() => setSelectedDonors([])} className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      );
    }

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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all-donations">{t('donations:donationsContent.tabs.allDonations', 'All Donations')}</TabsTrigger>
          <TabsTrigger value="donors">{t('donations:donor', 'Donors')}</TabsTrigger>
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      {t('donations:donationsContent.filter.title', 'Filter Donations')}
                      {getActiveFilterCount() > 0 && <Badge>{getActiveFilterCount()}</Badge>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="p-4">
                      <div className="mb-4">
                        <h4 className="font-medium leading-none">{t('donations:donationsContent.filter.title', 'Filter Donations')}</h4>
                      </div>
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>{t('donations:dateRange', 'Date Range')}</Label>
                            <DatePickerCalendar
                              initialFocus
                              mode="range"
                              defaultMonth={date?.from}
                              selected={date}
                              onSelect={setDate}
                              numberOfMonths={1}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('donations:type', 'Type')}</Label>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Checkbox id="tithe" checked={selectedDonationTypes.includes('Tithe')} onCheckedChange={() => handleDonationTypeFilterChange('Tithe')} />
                                <Label htmlFor="tithe">{t('donations:types.tithe', 'Tithe')}</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox id="offering" checked={selectedDonationTypes.includes('Offering')} onCheckedChange={() => handleDonationTypeFilterChange('Offering')} />
                                <Label htmlFor="offering">{t('donations:types.offering', 'Offering')}</Label>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>{t('donations:method', 'Method')}</Label>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Checkbox id="cash" checked={selectedDonationMethods.includes('cash')} onCheckedChange={() => handleDonationMethodFilterChange('cash')} />
                                <Label htmlFor="cash">{t('donations:methods.cash', 'Cash')}</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox id="check" checked={selectedDonationMethods.includes('check')} onCheckedChange={() => handleDonationMethodFilterChange('check')} />
                                <Label htmlFor="check">{t('donations:methods.check', 'Check')}</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox id="bankTransfer" checked={selectedDonationMethods.includes('bankTransfer')} onCheckedChange={() => handleDonationMethodFilterChange('bankTransfer')} />
                                <Label htmlFor="bankTransfer">{t('donations:methods.bankTransfer', 'Bank Transfer')}</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox id="other" checked={selectedDonationMethods.includes('other')} onCheckedChange={() => handleDonationMethodFilterChange('other')} />
                                <Label htmlFor="other">{t('donations:methods.other', 'Other')}</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox id="card" checked={selectedDonationMethods.includes('card')} onCheckedChange={() => handleDonationMethodFilterChange('card')} />
                                <Label htmlFor="card">{t('donations:methods.card', 'Credit/Debit Card')}</Label>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>{t('donations:donor', 'Donor')}</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between"
                                >
                                  {selectedDonors.length > 0
                                    ? `${selectedDonors.length} ${t('common:selected', 'selected')}`
                                    : t('donations:selectDonor', 'Select a donor...')}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0">
                                <Command>
                                  <CommandInput placeholder={t('donations:searchDonor', 'Search for a donor...')} />
                                  <CommandEmpty>{t('donations:noDonorFound', 'No donor found.')}</CommandEmpty>
                                  <CommandGroup>
                                    <ScrollArea className="h-48">
                                      {propDonors.map((donor) => (
                                        <CommandItem
                                          key={donor.id}
                                          onSelect={() => handleDonorFilterChange(donor.id)}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              selectedDonors.includes(donor.id) ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          {donor.name}
                                        </CommandItem>
                                      ))}
                                    </ScrollArea>
                                  </CommandGroup>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </ScrollArea>
                      <div className="flex justify-end pt-4 border-t mt-4">
                        <Button variant="ghost" onClick={clearFilters}>{t('donations:donationsContent.filter.clear', 'Clear')}</Button>
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
                  {donations.length > 0 ? (
                    <>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('donations:date', 'Date')}</TableHead>
                              <TableHead>{t('donations:donor', 'Donor')}</TableHead>
                              <TableHead>{t('donations:method', 'Method')}</TableHead>
                              <TableHead>{t('donations:type', 'Type')}</TableHead>
                              <TableHead className="text-right">{t('donations:amount', 'Amount')}</TableHead>
                              <TableHead className="text-center min-w-[150px]">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {donations.map((donation) => {
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
                                  <TableCell>{donation.donorName}</TableCell>
                                  <TableCell>{t(`donations:methods.${getPaymentMethodKey(donation.paymentMethodType)}`, donation.paymentMethodType)}</TableCell>
                                  <TableCell>{donation.donationTypeName}</TableCell>
                                  <TableCell className="text-right">${parseFloat(donation.amount).toFixed(2)}</TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <Badge 
                                        variant={
                                          donation.status === 'succeeded' ? 'default' :
                                          donation.status === 'pending' ? 'secondary' :
                                          donation.status === 'processing' ? 'secondary' :
                                          donation.status === 'failed' ? 'destructive' :
                                          donation.status === 'refunded' ? 'destructive' :
                                          donation.status === 'partially_refunded' ? 'destructive' :
                                          donation.status === 'canceled' ? 'outline' :
                                          donation.status === 'disputed' ? 'destructive' : 'secondary'
                                        }
                                        className="text-xs"
                                      >
                                        {donation.source === 'manual' && donation.status === 'succeeded' ? 'Completed' :
                                         donation.status === 'partially_refunded' ? 'Partial Refund' : 
                                         donation.status === 'refunded' ? 'Refunded' :
                                         donation.status === 'disputed' ? 'Disputed' :
                                         donation.status === 'succeeded' ? 'Succeeded' :
                                         donation.status === 'processing' ? 'Processing' :
                                         donation.status === 'pending' ? 'Pending' :
                                         donation.status === 'failed' ? 'Failed' :
                                         donation.status === 'canceled' ? t('donations:statuses.cancelled', 'Canceled') :
                                         donation.status}
                                      </Badge>
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
                      <div className="mt-4">
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
                  )}
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
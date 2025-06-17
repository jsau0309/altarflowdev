"use client"

import { useState, useEffect } from "react"
import { Search, Filter, Plus, Target, Users, X, Mail, Phone, DollarSign, ChevronsUpDown, Check } from "lucide-react"
import { format, parseISO } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { createManualDonation } from "@/lib/actions/donations.actions";
import type { CreateManualDonationParams } from '@/lib/actions/donations.actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog"
import { NewDonorModal } from "@/components/modals/new-donor-modal";
import { EditDonorModal } from "@/components/modals/edit-donor-modal"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getDonationTransactions } from "@/lib/actions/donations.actions";
import LoaderOne from "@/components/ui/loader-one";
import { getDonors } from "@/lib/actions/donors.actions";
import { DonorsTable } from "@/components/donors-table";
import { DonationDetailsDrawer } from "@/components/donations/donation-details-drawer";
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { DonorDetailsDrawer } from "@/components/donations/donor-details-drawer";
import { TableSkeleton } from "@/components/ui/table-skeleton-row";
import { TablePagination } from "@/components/ui/table-pagination";
import { Textarea } from "@/components/ui/textarea";
import { DonorFE, Member, DonationTransactionFE, DonorDetailsData } from "@/lib/types";
import { DonorFilterItem } from "@/lib/actions/donations.actions";
import { useTranslation } from 'react-i18next'

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
  const [manualDonationDate, setManualDonationDate] = useState<Date | undefined>(new Date());
  const [isDonorComboboxOpen, setIsDonorComboboxOpen] = useState(false);
  const [selectedDonorId, setSelectedDonorId] = useState<string | null>(null);
  const [selectedDonationType, setSelectedDonationType] = useState<string | undefined>(undefined);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | undefined>(undefined);
  const [manualDonationNotes, setManualDonationNotes] = useState<string>("");
  const [manualDonationAmount, setManualDonationAmount] = useState<string>("");
  const [isSavingManualDonation, setIsSavingManualDonation] = useState<boolean>(false);
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

  useEffect(() => {
    const fetchDonations = async () => {
      setIsLoading(true)
      const churchIdFromStorage = typeof window !== 'undefined' ? localStorage.getItem("churchId") : null;

      if (!churchIdFromStorage) {
        console.error("fetchDonations: churchId is not available from localStorage. Cannot fetch donations.");
        toast({
          title: t('common:error'),
          description: t('common:errors.churchId_not_found_detail', 'Church identifier is missing. Please ensure you are properly logged in or contact support.'),
          variant: "destructive",
        });
        setDonations([]);
        setTotalItems(0);
        setIsLoading(false);
        return;
      }

      try {
        const { donations: fetchedDonations, totalCount: fetchedTotal } = await getDonationTransactions({
          clerkOrgId: churchIdFromStorage, // Pass the orgId from storage as clerkOrgId
          page: currentPage,
          limit: itemsPerPage,
          startDate: date?.from,
          endDate: date?.to,
          donationTypes: selectedDonationTypes,
          paymentMethods: selectedDonationMethods,
          donorIds: selectedDonors,
        });
        // Renamed destructured variables to avoid conflict with existing state variables if any
        // and to match the expected return structure { donations: DonationTransactionFE[]; totalCount: number; }
        if (fetchedDonations) { // Use renamed variables
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
    setShowModal(false)
    console.log("TODO: Refresh donations after modal close")
  }

    const handleEditDonorFromList = (donor: DonorFE) => {
    // The modal expects DonorDetailsData which is based on Member.
    // We'll construct it with what we have from DonorFE and use defaults for the rest.
    const donorForModal: DonorDetailsData = {
      id: donor.id,
      // Fields from DonorFE, mapped to DonorDetailsData
      firstName: donor.firstName ?? '',
      lastName: donor.lastName ?? '',
      email: donor.email,
      phone: donor.phone,
      address: donor.address,           // Corrected: Mapped from DonorFE.address
      city: donor.city,
      state: donor.state,
      zipCode: donor.zipCode,           // Corrected: Mapped from DonorFE.zipCode
      createdAt: donor.createdAt,
      updatedAt: donor.updatedAt,

      // Fields related to member linking from DonorFE
      churchId: donor.churchId || null,
      memberId: donor.memberId || null,
      linkedMemberName: donor.linkedMemberName || null,

      // Other DonorDetailsData fields with defaults or nulls
      notes: null,                      // notes is in DonorDetailsData
      donations: [],                    // donations is in DonorDetailsData

      // Optional Member-specific fields from DonorDetailsData (defaults for unlinked/pure donors)
      membershipStatus: 'Visitor',      // membershipStatus is in DonorDetailsData
      joinDate: null,                   // joinDate is in DonorDetailsData
      ministryInvolvement: null,        // ministryInvolvement is in DonorDetailsData
      smsConsent: false,                // smsConsent is in DonorDetailsData
      smsConsentDate: null,             // smsConsentDate is in DonorDetailsData
      smsConsentMethod: null,           // smsConsentMethod is in DonorDetailsData
      preferredLanguage: 'en',          // preferredLanguage is in DonorDetailsData
    };
    setSelectedDonorObjectForModal(donorForModal);
    setShowEditDonorModal(true);
  };

  const handleAddDonorClick = () => {
    setShowDonorModal(true)
  }

  const handleDonorModalClose = () => {
    setShowDonorModal(false)
  }

  const handleSaveManualDonation = async () => {
    setIsSavingManualDonation(true);
    const churchId = localStorage.getItem("churchId");

    if (!churchId) {
      toast({
        title: t('common:error'),
        description: t('common:errors.churchId_not_found'),
        variant: "destructive",
      });
      setIsSavingManualDonation(false);
      return;
    }

    if (!manualDonationAmount || parseFloat(manualDonationAmount) <= 0) {
      toast({
        title: t('common:error'),
        description: t('newManualDonation.validation.invalid_amount'),
        variant: "destructive",
      });
      setIsSavingManualDonation(false);
      return;
    }

    if (!manualDonationDate) {
      toast({
        title: t('common:error'),
        description: t('newManualDonation.validation.date_required'),
        variant: "destructive",
      });
      setIsSavingManualDonation(false);
      return;
    }

    if (!selectedDonorId) {
      toast({
        title: t('common:error'),
        description: t('newManualDonation.validation.donor_required'),
        variant: "destructive",
      });
      setIsSavingManualDonation(false);
      return;
    }

    if (!selectedDonationType) {
      toast({
        title: t('common:error'),
        description: t('newManualDonation.validation.donation_type_required'),
        variant: "destructive",
      });
      setIsSavingManualDonation(false);
      return;
    }

    if (!selectedPaymentMethod) {
      toast({
        title: t('common:error'),
        description: t('newManualDonation.validation.payment_method_required'),
        variant: "destructive",
      });
      setIsSavingManualDonation(false);
      return;
    }

    console.log('Selected Donor ID before API call:', selectedDonorId);
    const amountInCents = Math.round(parseFloat(manualDonationAmount) * 100);

    const params: CreateManualDonationParams = {
      churchId,
      donorId: selectedDonorId,
      amount: amountInCents,
      donationDate: manualDonationDate,
      donationTypeName: selectedDonationType, // Ensure this matches CreateManualDonationParams
      paymentMethod: selectedPaymentMethod,
      // notes: manualDonationNotes, // Add back when schema supports it
    };

    try {
      const result = await createManualDonation(params);
      if (result.error) {
        toast({
          title: t('common:error'),
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('common:success'),
          description: t('newManualDonation.success_message'),
        });
        setShowModal(false);
        // Reset form fields
        setManualDonationAmount("");
        setManualDonationDate(new Date());
        setSelectedDonorId(null);
        // @ts-ignore // Clear combobox visual selection
        const donorComboboxInput = document.getElementById('donor-combobox-input') as HTMLInputElement | null;
        if (donorComboboxInput) {
            donorComboboxInput.setAttribute('data-value', '');
            donorComboboxInput.value = '';
        }
        setSelectedDonationType(undefined);
        setSelectedPaymentMethod(undefined);
        setManualDonationNotes("");
        
        // Refresh donations list
        if (activeTab === 'all-donations') {
            // Trigger the useEffect that calls fetchDonations
            // A common way is to change a dependency of that useEffect, like currentPage.
            // If already on page 1, changing to something else and back can work, or use a dedicated refresh trigger.
            const current = currentPage;
            setCurrentPage(prev => prev === 1 ? 0 : 1); // Toggle to ensure change if already 1
            if (current !== 1 && currentPage === 1) { /* no change needed */ } 
            else if (current === 1 && currentPage === 0) { setCurrentPage(1); }
            else { /* It was some other page, and now it's 1, so it should refresh */ }
            // A more robust method would be to have a dedicated function or a refresh key state.
            // For now, this attempts to trigger the existing useEffect for fetchDonations.
        }
      }
    } catch (error) {
      console.error("Failed to save manual donation:", error);
      toast({
        title: t('common:error'),
        description: t('common:errors.unexpected_error'),
        variant: "destructive",
      });
    } finally {
      setIsSavingManualDonation(false);
    }
  };

  const handleDonorCreated = () => {
    fetchDonors(); // Refetch donors to include the new one
  };

  const handleDonorUpdated = (updatedDonor: DonorDetailsData) => {
    setDonors(prevDonors =>
      prevDonors.map(donor => {
        if (donor.id === updatedDonor.id) {
          return {
            ...donor,
            firstName: updatedDonor.firstName,
            lastName: updatedDonor.lastName,
            email: updatedDonor.email,
            phone: updatedDonor.phone,
          };
        }
        return donor;
      })
    );
    handleEditDonorModalClose();
  };

  const handleEditDonorModalClose = () => {
    setShowEditDonorModal(false)
    setSelectedDonorObjectForModal(null)
    console.log("TODO: Refresh members after edit modal close")
  }

  const handleViewDonationDetails = (id: string) => {
    setSelectedDonationId(id)
    setShowDonationDetails(true)
  }

  const handleDonationTypeFilterChange = (type: string) => {
    setSelectedDonationTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const handleDonationMethodFilterChange = (method: string) => {
    setSelectedDonationMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    )
  }


  const handleDonorFilterChange = (donorId: string) => {
    setSelectedDonors((prev) =>
      prev.includes(donorId) ? prev.filter((id) => id !== donorId) : [...prev, donorId]
    )
  }

  const clearFilters = () => {
    setDate(undefined)
    setSelectedDonationMethods([])
    setSelectedDonors([])
    setSelectedDonationTypes([])
    setCurrentPage(1)
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (date) count++
    if (selectedDonationMethods.length > 0) count++
    if (selectedDonors.length > 0) count++
    if (selectedDonationTypes.length > 0) count++
    return count
  }

  const renderFilterBadges = () => {
    const badges = []
    if (date?.from) {
      badges.push(
        <Badge key="date" variant="secondary" className="mr-1 mb-1">
          {t('donations:date', 'Date')}:{" "}
          {date.to ? (
            <>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</>
          ) : (
            format(date.from, "LLL dd, y")
          )}
          <button onClick={() => setDate(undefined)} className="ml-1 rounded-full hover:bg-background/80 p-0.5">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )
    }
    if (selectedDonationTypes.length > 0) {
      badges.push(
        <Badge key="dtype" variant="secondary" className="mr-1 mb-1 capitalize">
          {t('donations:type', 'Type')}: {selectedDonationTypes.map(type => t(`common:${type}`, type)).join(", ")}
          <button onClick={() => setSelectedDonationTypes([])} className="ml-1 rounded-full hover:bg-background/80 p-0.5">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )
    }
    if (selectedDonationMethods.length > 0) {
      badges.push(
        <Badge key="method" variant="secondary" className="mr-1 mb-1 capitalize">
          {t('donations:method', 'Methods')}: {selectedDonationMethods.map(method => t(`donations:methods.${method.replace('-', '').toLowerCase()}`, method)).join(", ")}
          <button onClick={() => setSelectedDonationMethods([])} className="ml-1 rounded-full hover:bg-background/80 p-0.5">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )
    }
    if (selectedDonors.length > 0) {
      badges.push(
        <Badge key="donor" variant="secondary" className="mr-1 mb-1">
          {t('donations:donor', 'Donors')}: {selectedDonors.map(getDonorName).join(", ")}
          <button onClick={() => setSelectedDonors([])} className="ml-1 rounded-full hover:bg-background/80 p-0.5">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )
    }
    return badges.length > 0 ? (
      <div className="mt-2">
        {badges}
        <Button variant="link" size="sm" onClick={clearFilters} className="text-red-500 hover:text-red-700">
          {t('common:clearAllFilters', 'Clear All Filters')}
        </Button>
      </div>
    ) : null
  }




  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('donations:title', 'Donation Management')}</h1>
          <p className="text-muted-foreground">{t('donations:donationsContent.subtitle', 'Track and manage your church donations')}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all-donations">{t('donations:donationsContent.tabs.allDonations', 'All Donations')}</TabsTrigger>
          <TabsTrigger value="donors">{t('donations:donor', 'Donors')}</TabsTrigger>
        </TabsList>

        <TabsContent value="all-donations">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {t('donations:donationsContent.tabs.allDonations', 'All Donations')}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{t('donations:donationsContent.allDonations.subtitle', 'View, search, and filter all donations')}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Button onClick={handleNewDonationClick} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('donations:newDonation', 'New Donation')}
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto gap-2">
                      <Filter className="h-4 w-4" />
                      {t('common:filter', 'Filter')}
                      {getActiveFilterCount() > 0 && (
                        <Badge variant="secondary" className="ml-2 rounded-full px-1.5">
                          {getActiveFilterCount()}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-4" align="end">
                    <div className="space-y-4">
                      <h4 className="font-medium">{t('donations:donationsContent.filter.title', 'Filter Donations')}</h4>

                      <div className="grid gap-2">
                        <Label>{t('donations:dateRange', 'Date Range')}</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              id="date"
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {date?.from ? (
                                date.to ? (
                                  <>
                                    {format(date.from, "LLL dd, y")} -{" "}
                                    {format(date.to, "LLL dd, y")}
                                  </>
                                ) : (
                                  format(date.from, "LLL dd, y")
                                )
                              ) : (
                                <span>{t('common:pickDate', 'Pick a date')}</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <DatePickerCalendar
                              initialFocus
                              mode="range"
                              defaultMonth={date?.from}
                              selected={date}
                              onSelect={setDate}
                              numberOfMonths={2}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label>{t('donations:type', 'Donation Type')}</Label>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="tithe"
                            checked={selectedDonationTypes.includes("Tithe")}
                            onCheckedChange={() => handleDonationTypeFilterChange("Tithe")}
                          />
                          <Label htmlFor="tithe">{t('common:tithe', 'Tithe')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="offering"
                            checked={selectedDonationTypes.includes("Offering")}
                            onCheckedChange={() => handleDonationTypeFilterChange("Offering")}
                          />
                          <Label htmlFor="offering">{t('common:offering', 'Offering')}</Label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>{t('donations:method', 'Payment Method')}</Label>
                        <ScrollArea className="h-[100px]">
                          {[
                            { value: "cash", label: t('donations:methods.cash', 'Cash') },
                            { value: "check", label: t('donations:methods.check', 'Check') },
                            { value: "credit-card", label: t('donations:methods.card', 'Credit Card') },
                            { value: "bank-transfer", label: t('donations:methods.bankTransfer', 'Bank Transfer') },
                          ].map((method) => (
                            <div key={method.value} className="flex items-center space-x-2 p-1">
                              <Checkbox
                                id={`method-${method.value}`}
                                checked={selectedDonationMethods.includes(method.value)}
                                onCheckedChange={() => handleDonationMethodFilterChange(method.value)}
                              />
                              <Label htmlFor={`method-${method.value}`}>{method.label}</Label>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>

                      <div className="space-y-2">
                        <Label>{t('newManualDonation.donorLabel')}</Label>
                        <ScrollArea className="h-40">
                          {propDonors.length > 0 ? (
                            propDonors.map((donor) => (
                              <div key={donor.id} className="flex items-center space-x-2 py-1">
                                <Checkbox
                                  id={`donor-${donor.id}`}
                                  checked={selectedDonors.includes(donor.id)}
                                  onCheckedChange={() => handleDonorFilterChange(donor.id)}
                                />
                                <Label htmlFor={`donor-${donor.id}`} className="font-normal">
                                  {donor.name}
                                </Label>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {t('donations:noDonorsToList', 'No donors to list.')}
                            </p>
                          )}
                        </ScrollArea>
                      </div>

                      <Button variant="ghost" onClick={clearFilters} className="w-full justify-start">
                        <X className="mr-2 h-4 w-4" />
                        {t('donations:clearFilters', 'Clear Filters')}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="p-4">
              {renderFilterBadges()}
              {isLoading ? (
                <div className="flex justify-center items-center h-[500px]">
                  <LoaderOne />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('donations:date', 'Date')}</TableHead>
                        <TableHead>{t('donations:donor', 'Donor')}</TableHead>
                        <TableHead>{t('donations:method', 'Method')}</TableHead>
                        <TableHead>{t('donations:type', 'Type')}</TableHead>
                        <TableHead className="text-right">{t('common:amount', 'Amount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {donations.length > 0 ? (
                        donations.map((donation) => (
                          <TableRow key={donation.id} onClick={() => handleViewDonationDetails(donation.id)} className="cursor-pointer">
                            <TableCell>{format(parseISO(donation.transactionDate), "PP")}</TableCell>
                            <TableCell>{donation.donorName || (donation.donorId ? getDonorName(donation.donorId) : t('common:anonymous', 'Anonymous'))}</TableCell>
                            <TableCell className="capitalize">{donation.paymentMethodType || '-'}</TableCell>
                            <TableCell>{donation.donationTypeName}</TableCell>
                            <TableCell className="text-right font-medium">${donation.amount.toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">
                            {t('donations:no_donations_found', 'No donations found.')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {donations.length > 0 && (
                    <div className="mt-4">
                      <TablePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={(value) => {
                          setItemsPerPage(value)
                          setCurrentPage(1)
                        }}
                        totalItems={totalItems}
                      />
                    </div>
                  )}
                  {!isLoading && donations.length === 0 && (
                    <div className="flex min-h-[300px] items-center justify-center rounded-md border border-dashed p-4 sm:p-8 text-center">
                      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                        <h3 className="mt-4 text-lg font-semibold">{t('donations:donationsContent.empty.title', 'No donations found')}</h3>
                        <p className="mb-4 mt-2 text-sm text-muted-foreground">
                          {getActiveFilterCount() > 0
                            ? t('donations:donationsContent.empty.adjustFilters', 'Try adjusting your search or filters.')
                            : t('donations:donationsContent.empty.addFirst', 'Add your first donation to get started.')}
                        </p>
                        <Button onClick={handleNewDonationClick}>{t('donations:newDonation', 'Add New Donation')}</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="donors">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t('donations:donor', 'Donors')}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{t('donations:donorsContent.subtitle', 'Manage your donors')}</p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('donations:donorsContent.searchPlaceholder', 'Search by name or email...')}
                    value={donorSearchTerm}
                    onChange={(e) => setDonorSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button onClick={handleAddDonorClick}>
                  <Plus className="-ml-1 mr-2 h-4 w-4" />
                  {t('donations:donorsContent.addDonorButton', 'Add Donor')}
                </Button>
              </div>
            </div>
            <div className="p-4">
              {isDonorsLoading ? (
                <div className="flex justify-center items-center h-[500px]">
                  <LoaderOne />
                </div>
              ) : (
                <DonorsTable donors={donors} onEdit={handleEditDonorFromList} onViewDetails={(donorId: string) => {
                  setSelectedDonorIdForDetails(donorId);
                  setShowDonorDetails(true);
                }} />
              )}
            </div>
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
          </div>
        </TabsContent>
      </Tabs>

      {/* New Manual Donation Modal */}
      <Dialog open={showModal} onOpenChange={(open) => !open && handleModalClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('newManualDonation.title')}</DialogTitle>
            <DialogDescription>
              {t('newManualDonation.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">{t('newManualDonation.amountLabel')}</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="mt-1"
                  value={manualDonationAmount}
                  onChange={(e) => setManualDonationAmount(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="date">{t('newManualDonation.dateLabel')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className="w-full justify-start text-left font-normal mt-1"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {manualDonationDate ? format(manualDonationDate, "PPP") : <span>{t('common:pickADate')}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <DatePickerCalendar
                      mode="single"
                      selected={manualDonationDate}
                      onSelect={setManualDonationDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {/* Donor Selection */}
            <div>
              <Label htmlFor="donor">{t('newManualDonation.donorLabel')}</Label>
              <Popover open={isDonorComboboxOpen} onOpenChange={setIsDonorComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="donor"
                    variant="outline"
                    role="combobox"
                    aria-expanded={isDonorComboboxOpen}
                    className="w-full justify-between mt-1"
                  >
                    {selectedDonorId
                      ? propDonors.find((donor) => donor.id === selectedDonorId)?.name
                      : t('newManualDonation.selectDonor')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder={t('newManualDonation.searchDonor')}/>
                    <CommandEmpty>{t('newManualDonation.noDonorFound')}</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-[200px]">
                        {propDonors.map((donor) => (
                          <CommandItem
                            key={donor.id}
                            value={donor.name}
                            onSelect={() => {
                              setSelectedDonorId(donor.id === selectedDonorId ? null : donor.id)
                              setIsDonorComboboxOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedDonorId === donor.id ? "opacity-100" : "opacity-0"
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
              <Button variant="link" size="sm" className="mt-1 px-0" onClick={() => setShowDonorModal(true)}>
                {t('newManualDonation.addNewDonor')}
              </Button>
            </div>

            {/* Donation Type and Payment Method (Side-by-side) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="donationType">{t('newManualDonation.donationType')}</Label>
                <Select value={selectedDonationType} onValueChange={setSelectedDonationType}>
                  <SelectTrigger id="donationType" className="mt-1">
                    <SelectValue placeholder={t('newManualDonation.selectDonationType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tithe">{t('donations:funds.tithe')}</SelectItem>
                    <SelectItem value="Offering">{t('donations:funds.offering')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="paymentMethod">{t('newManualDonation.paymentMethod')}</Label>
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  <SelectTrigger id="paymentMethod" className="mt-1">
                    <SelectValue placeholder={t('newManualDonation.selectPaymentMethod')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">{t('donations:methods.cash')}</SelectItem>
                    <SelectItem value="Check">{t('donations:methods.check')}</SelectItem>
                    <SelectItem value="Bank Transfer">{t('donations:methods.bankTransfer')}</SelectItem>
                    <SelectItem value="Other">{t('donations:methods.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes (Optional) */}
            <div>
              <Label htmlFor="notes">{t('newManualDonation.notes')}</Label>
              <Textarea
                id="notes"
                value={manualDonationNotes}
                onChange={(e) => setManualDonationNotes(e.target.value)}
                placeholder={t('newManualDonation.notesPlaceholder')}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>{t('newManualDonation.cancelButton')}</Button>
            <Button onClick={handleSaveManualDonation} disabled={isSavingManualDonation}>{isSavingManualDonation ? t('newManualDonation.saving') : t('newManualDonation.saveButton')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
  )
}
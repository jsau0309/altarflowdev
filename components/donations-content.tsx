"use client"

import { useState, useEffect } from "react"
import { Search, Filter, Plus, Target, Users, X, Mail, Phone, DollarSign } from "lucide-react"
import { format, parseISO } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { NewDonationModal } from "@/components/modals/new-donation-modal"
import { CampaignModal } from "@/components/modals/campaign-modal"
import { AddMemberModal } from "@/components/modals/add-donor-modal"
import { EditDonorModal } from "@/components/modals/edit-donor-modal"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getDonationTransactions } from "@/lib/actions/donations.actions"
import { DonationDetailsDrawer } from "@/components/donations/donation-details-drawer"
import { DonorDetailsDrawer } from "@/components/donations/donor-details-drawer"
import { TablePagination } from "@/components/ui/table-pagination"
import { Member, Campaign, DonationTransactionFE, DonorDetailsData } from "@/lib/types"
import { useTranslation } from 'react-i18next'

interface DonationsContentProps {
  propMembers: Member[];
  propCampaigns: Campaign[];
}

export default function DonationsContent({ propMembers: members, propCampaigns: campaigns }: DonationsContentProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [showDonorModal, setShowDonorModal] = useState(false)
  const [activeTab, setActiveTab] = useState("all-donations")
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | undefined>(undefined)
  const [campaignFilter, setCampaignFilter] = useState<"all" | "active" | "inactive">("active")
  const [donorSearchTerm, setDonorSearchTerm] = useState("")
  const [showEditDonorModal, setShowEditDonorModal] = useState(false)
  const [selectedDonationId, setSelectedDonationId] = useState<string | null>(null)
  const [showDonationDetails, setShowDonationDetails] = useState(false)
  const [showDonorDetails, setShowDonorDetails] = useState(false)
  const [selectedDonorIdForDetails, setSelectedDonorIdForDetails] = useState<string | null>(null)
  const [selectedDonorObjectForModal, setSelectedDonorObjectForModal] = useState<DonorDetailsData | null>(null)

  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null)
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])
  const [selectedDonationMethods, setSelectedDonationMethods] = useState<string[]>([])
  const [selectedDonors, setSelectedDonors] = useState<string[]>([])
  const [selectedDonationTypes, setSelectedDonationTypes] = useState<string[]>([])

  const [donations, setDonations] = useState<DonationTransactionFE[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const { t } = useTranslation(['donations', 'common', 'expenses', 'campaigns', 'members'])

  useEffect(() => {
    const fetchDonations = async () => {
      setIsLoading(true)
      try {
        const data = await getDonationTransactions({
          page: currentPage,
          limit: itemsPerPage,
          searchTerm: searchTerm,
        })
        if (data.donations) {
          setDonations(data.donations)
          setTotalItems(data.totalCount)
        } else {
          setDonations([])
          setTotalItems(0)
        }
      } catch (error) {
        console.error("Failed to fetch donations:", error)
        setDonations([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchDonations()
  }, [currentPage, itemsPerPage, searchTerm])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get("tab")
      if (tabParam && ["all-donations", "campaigns", "donors"].includes(tabParam)) {
        setActiveTab(tabParam)
      }
    }
  }, [])

  const filteredDonors = members.filter((member: Member) => {
    if (!donorSearchTerm) return true
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase()
    return (
      fullName.includes(donorSearchTerm.toLowerCase()) ||
      (member.email && member.email.toLowerCase().includes(donorSearchTerm.toLowerCase())) ||
      (member.phone && member.phone.toLowerCase().includes(donorSearchTerm.toLowerCase()))
    )
  })

  const filteredCampaigns = campaigns.filter((campaign: Campaign) => {
    if (campaignFilter === "active" && !campaign.isActive) return false
    if (campaignFilter === "inactive" && campaign.isActive) return false
    if (!searchTerm) return true
    return (
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (campaign.description || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const getDonorName = (donorId: string) => {
    const donor = members.find((m) => m.id === donorId)
    return donor ? `${donor.firstName} ${donor.lastName}` : t('common:unknownDonor', 'Unknown Donor')
  }

  const getCampaignName = (campaignId: string) => {
    const campaign = campaigns.find((c) => c.id === campaignId)
    return campaign ? campaign.name : t('common:unknownCampaign', 'Unknown Campaign')
  }

  const handleNewDonationClick = () => {
    setShowModal(true)
    setActiveTab("all-donations")
  }

  const handleModalClose = () => {
    setShowModal(false)
    console.log("TODO: Refresh donations after modal close")
  }

  const handleEditDonorFromList = (member: Member) => {
    const donorForModal: DonorDetailsData = {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone,
      address: member.address,
      city: member.city,
      state: member.state,
      zipCode: member.zipCode,
      membershipStatus: member.membershipStatus,
      joinDate: member.joinDate,
      ministryInvolvement: member.ministryInvolvement,
      smsConsent: member.smsConsent,
      smsConsentDate: member.smsConsentDate,
      smsConsentMethod: member.smsConsentMethod,
      preferredLanguage: member.preferredLanguage,
      notes: member.notes,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      donations: [], // Assuming we don't pass donations to the edit modal
    };
    setSelectedDonorObjectForModal(donorForModal);
    setShowEditDonorModal(true);
  };

  const handleEditCampaign = (id: string) => {
    setSelectedCampaignId(id)
    setShowCampaignModal(true)
  }

  const handleCampaignModalClose = () => {
    setShowCampaignModal(false)
    setSelectedCampaignId(undefined)
    console.log("TODO: Refresh campaigns after modal close")
  }

  const handleAddDonorClick = () => {
    setShowDonorModal(true)
  }

  const handleDonorModalClose = () => {
    setShowDonorModal(false)
    console.log("TODO: Refresh members after modal close")
  }

  const handleToggleCampaignStatus = (id: string, currentStatus: boolean) => {
    console.log(`TODO: Update campaign ${id} status to ${!currentStatus}`)
    console.log("TODO: Refresh campaigns after status toggle")
  }

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

  const handleCampaignFilterChange = (campaignId: string) => {
    setSelectedCampaigns((prev) =>
      prev.includes(campaignId) ? prev.filter((id) => id !== campaignId) : [...prev, campaignId]
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
    setDateRange(null)
    setSelectedCampaigns([])
    setSelectedDonationMethods([])
    setSelectedDonors([])
    setSelectedDonationTypes([])
    setSearchTerm("")
    setCurrentPage(1)
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (dateRange) count++
    if (selectedCampaigns.length > 0) count++
    if (selectedDonationMethods.length > 0) count++
    if (selectedDonors.length > 0) count++
    if (selectedDonationTypes.length > 0) count++
    return count
  }

  const renderFilterBadges = () => {
    const badges = []
    if (dateRange) {
      badges.push(
        <Badge key="date" variant="secondary" className="mr-1 mb-1">
          {t('donations:date', 'Date')}: {format(parseISO(dateRange.start), "PP")} - {format(parseISO(dateRange.end), "PP")}
          <button onClick={() => setDateRange(null)} className="ml-1 rounded-full hover:bg-background/80 p-0.5">
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
    if (selectedCampaigns.length > 0) {
      badges.push(
        <Badge key="camp" variant="secondary" className="mr-1 mb-1">
          {t('donations:campaigns', 'Campaigns')}: {selectedCampaigns.map(getCampaignName).join(", ")}
          <button onClick={() => setSelectedCampaigns([])} className="ml-1 rounded-full hover:bg-background/80 p-0.5">
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

  const handleViewDonorDetails = (id: string) => {
    setSelectedDonorIdForDetails(id)
    setShowDonorDetails(true)
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all-donations">{t('donations:donationsContent.tabs.allDonations', 'All Donations')}</TabsTrigger>
          <TabsTrigger value="campaigns">{t('donations:campaigns', 'Campaigns')}</TabsTrigger>
          <TabsTrigger value="donors">{t('donations:donor', 'Donors')}</TabsTrigger>
        </TabsList>

        <TabsContent value="all-donations">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {t('donations:donationsContent.tabs.allDonations', 'All Donations')}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{t('donations:donationsContent.allDonations.subtitle', 'View, search, and filter all donations')}</p>
              </div>
              <Button onClick={handleNewDonationClick} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('donations:newDonation', 'New Donation')}
              </Button>
            </div>

            <div className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="relative w-full sm:flex-grow">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={t('donations:donationsContent.allDonations.searchPlaceholder', 'Search donations (donor, campaign, amount...)')}
                    className="w-full rounded-md pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
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

                      <div className="space-y-1">
                        <Label>{t('donations:dateRange', 'Date Range')}</Label>
                        <Input type="text" placeholder={t('donations:startDate', 'Start Date')} />
                        <Input type="text" placeholder={t('donations:endDate', 'End Date')} />
                      </div>

                      <div className="space-y-2">
                        <Label>{t('donations:type', 'Donation Type')}</Label>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="traditional"
                            checked={selectedDonationTypes.includes("traditional")}
                            onCheckedChange={() => handleDonationTypeFilterChange("traditional")}
                          />
                          <Label htmlFor="traditional">{t('common:traditional', 'Traditional')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="digital"
                            checked={selectedDonationTypes.includes("digital")}
                            onCheckedChange={() => handleDonationTypeFilterChange("digital")}
                          />
                          <Label htmlFor="digital">{t('common:digital', 'Digital')}</Label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>{t('donations:campaign', 'Campaign')}</Label>
                        <ScrollArea className="h-[150px]">
                          {campaigns.map((campaign) => (
                            <div key={campaign.id} className="flex items-center space-x-2 p-1">
                              <Checkbox
                                id={`campaign-${campaign.id}`}
                                checked={selectedCampaigns.includes(campaign.id)}
                                onCheckedChange={() => handleCampaignFilterChange(campaign.id)}
                              />
                              <Label htmlFor={`campaign-${campaign.id}`}>{campaign.name}</Label>
                            </div>
                          ))}
                        </ScrollArea>
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
                        <Label>{t('donations:donor', 'Donor')}</Label>
                        <ScrollArea className="h-[150px]">
                          {members.map((member) => (
                            <div key={member.id} className="flex items-center space-x-2 p-1">
                              <Checkbox
                                id={`donor-${member.id}`}
                                checked={selectedDonors.includes(member.id)}
                                onCheckedChange={() => handleDonorFilterChange(member.id)}
                              />
                              <Label htmlFor={`donor-${member.id}`}>
                                {member.firstName} {member.lastName}
                              </Label>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {renderFilterBadges()}

              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(itemsPerPage)].map((_, i) => (
                    <div key={i} className="h-10 bg-muted animate-pulse rounded-md"></div>
                  ))}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('donations:date', 'Date')}</TableHead>
                        <TableHead>{t('donations:donor', 'Donor')}</TableHead>
                        <TableHead>{t('donations:campaign', 'Campaign')}</TableHead>
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
                            <TableCell>{donation.campaignId ? getCampaignName(donation.campaignId) : '-'}</TableCell>
                            <TableCell className="capitalize">{donation.paymentMethodType || '-'}</TableCell>
                            <TableCell>{donation.donationTypeName}</TableCell>
                            <TableCell className="text-right font-medium">${donation.amount.toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center h-24">
                            {t('donations:donationsContent.empty.title', 'No donations found')}
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
                </>
              )}
              { !isLoading && donations.length === 0 && (
                <div className="flex min-h-[300px] items-center justify-center rounded-md border border-dashed p-4 sm:p-8 text-center">
                  <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                    <h3 className="mt-4 text-lg font-semibold">{t('donations:donationsContent.empty.title', 'No donations found')}</h3>
                    <p className="mb-4 mt-2 text-sm text-muted-foreground">
                      {searchTerm || getActiveFilterCount() > 0
                        ? t('donations:donationsContent.empty.adjustFilters', 'Try adjusting your search or filters.')
                        : t('donations:donationsContent.empty.addFirst', 'Add your first donation to get started.')}
                    </p>
                    <Button onClick={handleNewDonationClick}>{t('donations:newDonation', 'Add New Donation')}</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="campaigns">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  {t('donations:campaigns', 'Campaigns')}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{t('campaigns:campaignsContent.subtitle', 'Manage your donation campaigns')}</p>
              </div>
              <Button onClick={() => setShowCampaignModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('campaigns:newCampaign', 'New Campaign')}
              </Button>
            </div>
            <div className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="relative w-full sm:flex-grow">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={t('campaigns:campaignsContent.searchPlaceholder', 'Search campaigns...')}
                    className="w-full rounded-md pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={campaignFilter} onValueChange={(value) => setCampaignFilter(value as any)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder={t('campaigns:campaignsContent.filterPlaceholder', 'Filter by status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('campaigns:campaignsContent.filter.all', 'All Campaigns')}</SelectItem>
                    <SelectItem value="active">{t('campaigns:statuses.active', 'Active Campaigns')}</SelectItem>
                    <SelectItem value="inactive">{t('campaigns:campaignsContent.filter.inactive', 'Inactive Campaigns')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-10 bg-muted animate-pulse rounded-md"></div>
                  ))}
                </div>
              ) : filteredCampaigns.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('campaigns:name', 'Name')}</TableHead>
                      <TableHead>{t('common:goal', 'Goal')}</TableHead>
                      <TableHead>{t('campaigns:startDate', 'Start Date')}</TableHead>
                      <TableHead>{t('campaigns:endDate', 'End Date')}</TableHead>
                      <TableHead>{t('campaigns:status', 'Status')}</TableHead>
                      <TableHead className="text-right">{t('common:actions', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell>{campaign.goalAmount ? `$${parseFloat(campaign.goalAmount).toLocaleString()}` : t('common:notApplicable', 'N/A')}</TableCell>
                        <TableCell>{campaign.startDate ? format(parseISO(campaign.startDate), "PP") : t('common:notSet', 'Not Set')}</TableCell>
                        <TableCell>{campaign.endDate ? format(parseISO(campaign.endDate), "PP") : t('common:ongoing', 'Ongoing')}</TableCell>
                        <TableCell>
                          <Badge variant={campaign.isActive ? "default" : "secondary"}>
                            {campaign.isActive ? t('campaigns:statuses.active', 'Active') : t('campaigns:statuses.inactive', 'Inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleEditCampaign(campaign.id)}>
                            {t('common:edit', 'Edit')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleCampaignStatus(campaign.id, campaign.isActive ?? false)}
                            className="ml-2"
                          >
                            {(campaign.isActive ?? false) ? t('common:deactivate', 'Deactivate') : t('common:activate', 'Activate')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex min-h-[300px] items-center justify-center rounded-md border border-dashed p-4 sm:p-8 text-center">
                  <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                    <h3 className="mt-4 text-lg font-semibold">{t('campaigns:campaignsContent.empty.title', 'No campaigns found')}</h3>
                    <p className="mb-4 mt-2 text-sm text-muted-foreground">
                      {searchTerm || campaignFilter !== "all"
                        ? t('campaigns:campaignsContent.empty.adjustFilters', 'Try adjusting your search or filters.')
                        : t('campaigns:campaignsContent.empty.addFirst', 'Add your first campaign to get started.')}
                    </p>
                    <Button onClick={() => setShowCampaignModal(true)}>{t('campaigns:newCampaign', 'Add New Campaign')}</Button>
                  </div>
                </div>
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
              <Button onClick={handleAddDonorClick} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('donations:donorsContent.addDonorButton', 'Add Donor')}
              </Button>
            </div>
            <div className="p-4">
              <div className="relative w-full max-w-sm mb-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('donations:donorsContent.searchPlaceholder', 'Search donors (name, email, phone)...')}
                  className="w-full rounded-md pl-8"
                  value={donorSearchTerm}
                  onChange={(e) => setDonorSearchTerm(e.target.value)}
                />
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-10 bg-muted animate-pulse rounded-md"></div>
                  ))}
                </div>
              ) : filteredDonors.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('members:firstName', 'Name')}</TableHead>
                      <TableHead>{t('members:email', 'Email')}</TableHead>
                      <TableHead>{t('members:phone', 'Phone')}</TableHead>
                      <TableHead>{t('common:joined', 'Joined')}</TableHead>
                      <TableHead className="text-right">{t('common:actions', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDonors.map((member) => (
                      <TableRow
                        key={member.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleViewDonorDetails(member.id)}
                      >
                        <TableCell className="font-medium">
                          {member.firstName} {member.lastName}
                        </TableCell>
                        <TableCell>
                          {member.email ? (
                            <a
                              href={`mailto:${member.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Mail className="h-3 w-3" /> {member.email}
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {member.phone ? (
                            <a
                              href={`tel:${member.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3" /> {member.phone}
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{member.joinDate ? format(parseISO(member.joinDate), "PP") : "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={(e) => {
                            e.stopPropagation();
                            handleEditDonorFromList(member);
                          }}>
                            {t('common:edit', 'Edit')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex min-h-[300px] items-center justify-center rounded-md border border-dashed p-4 sm:p-8 text-center">
                  <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                    <h3 className="mt-4 text-lg font-semibold">{t('donations:donorsContent.empty.title', 'No donors found')}</h3>
                    <p className="mb-4 mt-2 text-sm text-muted-foreground">
                      {donorSearchTerm
                        ? t('donations:donorsContent.empty.adjustFilters', 'Try adjusting your search.')
                        : t('donations:donorsContent.empty.addFirst', 'Add your first donor to get started.')}
                    </p>
                    <Button onClick={handleAddDonorClick}>{t('donations:donorsContent.addDonorButton', 'Add Donor')}</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <NewDonationModal isOpen={showModal} onClose={handleModalClose} />
      <CampaignModal
        isOpen={showCampaignModal}
        onClose={handleCampaignModalClose}
        campaignId={selectedCampaignId}
      />
      <AddMemberModal isOpen={showDonorModal} onClose={handleDonorModalClose} />
      {showEditDonorModal && selectedDonorObjectForModal && (
        <EditDonorModal
          isOpen={showEditDonorModal}
          onClose={handleEditDonorModalClose}
          donor={selectedDonorObjectForModal}
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
"use client"


import { useState, useEffect } from "react"
import { Search, Filter, Plus, Target, Users, X, Mail, Phone, DollarSign } from "lucide-react"
import { format, isAfter, isBefore, parseISO } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { NewDonationModal } from "@/components/modals/new-donation-modal"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CampaignModal } from "@/components/modals/campaign-modal"
import { AddDonorModal } from "@/components/modals/add-donor-modal"
import { EditDonorModal } from "@/components/modals/edit-donor-modal"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DonationDetailsDrawer } from "@/components/donations/donation-details-drawer"
import { DonorDetailsDrawer } from "@/components/donations/donor-details-drawer"
import { TablePagination } from "@/components/ui/table-pagination"
import { Donation, Member, Campaign } from "@/lib/types"

export function DonationsContent() {
  const [donations] = useState<Donation[]>([])
  const [members] = useState<Member[]>([])
  const [campaigns] = useState<Campaign[]>([])
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
  const [selectedDonorId, setSelectedDonorId] = useState<string | null>(null)
  const [selectedDonationId, setSelectedDonationId] = useState<string | null>(null)
  const [showDonationDetails, setShowDonationDetails] = useState(false)
  const [showDonorDetails, setShowDonorDetails] = useState(false)
  const [selectedDonorIdForDetails, setSelectedDonorIdForDetails] = useState<string | null>(null)

  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null)
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])
  const [selectedDonationMethods, setSelectedDonationMethods] = useState<string[]>([])
  const [selectedDonors, setSelectedDonors] = useState<string[]>([])
  const [selectedDonationTypes, setSelectedDonationTypes] = useState<string[]>([])

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const [displayedDonations, setDisplayedDonations] = useState<Donation[]>([])

  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("TODO: Fetch initial data (donations, members, campaigns)");
      setIsLoading(false);
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get("tab")
      if (tabParam && ["all-donations", "campaigns", "donors"].includes(tabParam)) {
        setActiveTab(tabParam)
      }
    }
  }, [])

  useEffect(() => {
    if (dateRange || selectedCampaigns.length > 0 || selectedDonationMethods.length > 0 || selectedDonors.length > 0 || selectedDonationTypes.length > 0 || searchTerm) {
      const filtered = donations.filter((donation) => {
        if (activeTab !== "all-donations" && activeTab !== "campaigns" && activeTab !== "donors") {
          return true
        }

        if (selectedDonationTypes.length > 0) {
          if (!selectedDonationTypes.includes(donation.isDigital ? "digital" : "traditional")) {
            return false
          }
        }

        if (searchTerm) {
          const donor = members.find((m) => m.id === donation.donorId)
          const donorName = donor ? `${donor.firstName} ${donor.lastName}` : ""
          const campaign = campaigns.find((c) => c.id === donation.campaignId)
          const campaignName = campaign ? campaign.name : ""

          const matchesSearch =
            campaignName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            donorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            donation.amount.toString().includes(searchTerm) ||
            donation.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase())

          if (!matchesSearch) return false
        }

        if (dateRange && dateRange.start && dateRange.end) {
          const donationDate = parseISO(donation.date)
          const startDate = parseISO(dateRange.start)
          const endDate = parseISO(dateRange.end)

          if (isBefore(donationDate, startDate) || isAfter(donationDate, endDate)) {
            return false
          }
        }

        if (selectedCampaigns.length > 0 && !selectedCampaigns.includes(donation.campaignId)) {
          return false
        }

        if (selectedDonationMethods.length > 0 && !selectedDonationMethods.includes(donation.paymentMethod)) {
          return false
        }

        if (selectedDonors.length > 0 && !selectedDonors.includes(donation.donorId)) {
          return false
        }

        return true
      })

      setDisplayedDonations(filtered)
      setCurrentPage(1)
    }
  }, [donations, members, campaigns, dateRange, selectedCampaigns, selectedDonationMethods, selectedDonors, selectedDonationTypes, searchTerm, activeTab])

  const totalItems = displayedDonations.length
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentDonations = displayedDonations.slice(indexOfFirstItem, indexOfLastItem)

  const filteredDonors = members.filter((member) => {
    if (!donorSearchTerm) return true
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase()
    return (
      fullName.includes(donorSearchTerm.toLowerCase()) ||
      (member.email && member.email.toLowerCase().includes(donorSearchTerm.toLowerCase())) ||
      (member.phone && member.phone.toLowerCase().includes(donorSearchTerm.toLowerCase()))
    )
  })

  const filteredCampaigns = campaigns.filter((campaign) => {
    if (campaignFilter === "active" && !campaign.isActive) return false
    if (campaignFilter === "inactive" && campaign.isActive) return false
    if (!searchTerm) return true
    return (
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const getDonorName = (donorId: string) => {
    const donor = members.find((m) => m.id === donorId)
    return donor ? `${donor.firstName} ${donor.lastName}` : "Unknown Donor"
  }

  const getCampaignName = (campaignId: string) => {
    const campaign = campaigns.find((c) => c.id === campaignId)
    return campaign ? campaign.name : "Unknown Campaign"
  }

  const handleNewDonationClick = (donationType: "digital" | "traditional" = "traditional") => {
    setShowModal(true)
    setActiveTab("all-donations")
  }

  const handleModalClose = () => {
    setShowModal(false)
    console.log("TODO: Refresh donations after modal close")
  }

  const handleEditCampaign = (id: string) => {
    setSelectedCampaignId(id)
    setShowCampaignModal(true)
    console.log("TODO: Check if members need refresh here?")
  }

  const handleCampaignModalClose = () => {
    setShowCampaignModal(false)
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
    console.log(`TODO: Update campaign ${id} status to ${!currentStatus}`);
    console.log("TODO: Refresh campaigns after status toggle")
  }

  const handleEditDonorModalClose = () => {
    setShowEditDonorModal(false)
    setSelectedDonorId(null)
    console.log("TODO: Refresh members after edit modal close")
  }

  const handleViewDonationDetails = (id: string) => {
    setSelectedDonationId(id)
    setShowDonationDetails(true)
  }

  const handleDonationTypeFilterChange = (type: string) => {
    setSelectedDonationTypes((prev) => {
      if (prev.includes(type)) {
        return prev.filter((t) => t !== type)
      } else {
        return [...prev, type]
      }
    })
  }

  const handleCampaignFilterChange = (campaignId: string) => {
    setSelectedCampaigns((prev) => {
      if (prev.includes(campaignId)) {
        return prev.filter((id) => id !== campaignId)
      } else {
        return [...prev, campaignId]
      }
    })
  }

  const handleDonationMethodFilterChange = (method: string) => {
    setSelectedDonationMethods((prev) => {
      if (prev.includes(method)) {
        return prev.filter((m) => m !== method)
      } else {
        return [...prev, method]
      }
    })
  }

  const handleDonorFilterChange = (donorId: string) => {
    setSelectedDonors((prev) => {
      if (prev.includes(donorId)) {
        return prev.filter((id) => id !== donorId)
      } else {
        return [...prev, donorId]
      }
    })
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
          Date: {format(parseISO(dateRange.start), "PP")} - {format(parseISO(dateRange.end), "PP")}
          <button onClick={() => setDateRange(null)} className="ml-1 rounded-full hover:bg-background/80 p-0.5">
            <X className="h-3 w-3" />
          </button>
        </Badge>,
      )
    }
    if (selectedDonationTypes.length > 0) {
      badges.push(
        <Badge key="dtype" variant="secondary" className="mr-1 mb-1 capitalize">
          Type: {selectedDonationTypes.join(", ")}
          <button onClick={() => setSelectedDonationTypes([])} className="ml-1 rounded-full hover:bg-background/80 p-0.5">
            <X className="h-3 w-3" />
          </button>
        </Badge>,
      )
    }
    if (selectedCampaigns.length > 0) {
      badges.push(
        <Badge key="camp" variant="secondary" className="mr-1 mb-1">
          Campaigns: {selectedCampaigns.map(getCampaignName).join(", ")}
          <button onClick={() => setSelectedCampaigns([])} className="ml-1 rounded-full hover:bg-background/80 p-0.5">
            <X className="h-3 w-3" />
          </button>
        </Badge>,
      )
    }
    if (selectedDonationMethods.length > 0) {
      badges.push(
        <Badge key="method" variant="secondary" className="mr-1 mb-1 capitalize">
          Methods: {selectedDonationMethods.join(", ")}
          <button onClick={() => setSelectedDonationMethods([])} className="ml-1 rounded-full hover:bg-background/80 p-0.5">
            <X className="h-3 w-3" />
          </button>
        </Badge>,
      )
    }
    if (selectedDonors.length > 0) {
      badges.push(
        <Badge key="donor" variant="secondary" className="mr-1 mb-1">
          Donors: {selectedDonors.map(getDonorName).join(", ")}
          <button onClick={() => setSelectedDonors([])} className="ml-1 rounded-full hover:bg-background/80 p-0.5">
            <X className="h-3 w-3" />
          </button>
        </Badge>,
      )
    }
    return badges.length > 0 ? (
      <div className="mt-2">
        {badges}
        <Button variant="link" size="sm" onClick={clearFilters} className="text-red-500 hover:text-red-700">
          Clear All Filters
        </Button>
      </div>
    ) : null
  }

  const handleViewDonorDetails = (id: string) => {
    setSelectedDonorIdForDetails(id)
    setShowDonorDetails(true)
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-8 p-4 md:p-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Donation Management</h1>
          <p className="text-muted-foreground">Track and manage your church donations</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all-donations">All Donations</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="donors">Donors</TabsTrigger>
          </TabsList>

          <TabsContent value="all-donations">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="p-6 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    All Donations
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">View, search, and filter all donations</p>
                </div>
                <Button onClick={() => handleNewDonationClick()} className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Donation
                </Button>
              </div>

              <div className="p-4">
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="relative w-full sm:flex-grow">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search donations (donor, campaign, amount...)"
                      className="w-full rounded-md pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto gap-2">
                        <Filter className="h-4 w-4" />
                        Filter
                        {getActiveFilterCount() > 0 && (
                          <Badge variant="secondary" className="ml-2 rounded-full px-1.5">
                            {getActiveFilterCount()}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-4" align="end">
                      <div className="space-y-4">
                        <h4 className="font-medium">Filter Donations</h4>

                        <div className="space-y-1">
                          <Label>Date Range</Label>
                          <Input type="text" placeholder="Start Date" />
                          <Input type="text" placeholder="End Date" />
                        </div>

                        <div className="space-y-2">
                          <Label>Donation Type</Label>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="traditional"
                              checked={selectedDonationTypes.includes("traditional")}
                              onCheckedChange={() => handleDonationTypeFilterChange("traditional")}
                            />
                            <Label htmlFor="traditional">Traditional</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="digital"
                              checked={selectedDonationTypes.includes("digital")}
                              onCheckedChange={() => handleDonationTypeFilterChange("digital")}
                            />
                            <Label htmlFor="digital">Digital</Label>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Campaign</Label>
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
                          <Label>Payment Method</Label>
                          <ScrollArea className="h-[100px]">
                            {[
                              { value: "cash", label: "Cash" },
                              { value: "check", label: "Check" },
                              { value: "credit-card", label: "Credit Card" },
                              { value: "bank-transfer", label: "Bank Transfer" },
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
                          <Label>Donor</Label>
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
                ) : currentDonations.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Donor</TableHead>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentDonations.map((donation) => (
                          <TableRow
                            key={donation.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleViewDonationDetails(donation.id)}
                          >
                            <TableCell>{format(parseISO(donation.date), "PP")}</TableCell>
                            <TableCell>{getDonorName(donation.donorId)}</TableCell>
                            <TableCell>{getCampaignName(donation.campaignId)}</TableCell>
                            <TableCell className="capitalize">{donation.paymentMethod.replace("-", " ")}</TableCell>
                            <TableCell>
                              <Badge variant={donation.isDigital ? "secondary" : "outline"}>
                                {donation.isDigital ? "Digital" : "Traditional"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${donation.amount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
                  </>
                ) : (
                  <div className="flex min-h-[300px] items-center justify-center rounded-md border border-dashed p-4 sm:p-8 text-center">
                    <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                      <h3 className="mt-4 text-lg font-semibold">No donations found</h3>
                      <p className="mb-4 mt-2 text-sm text-muted-foreground">
                        {searchTerm || getActiveFilterCount() > 0
                          ? "Try adjusting your search or filters."
                          : "Add your first donation to get started."}
                      </p>
                      <Button onClick={() => handleNewDonationClick()}>Add New Donation</Button>
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
                    Campaigns
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Manage your donation campaigns</p>
                </div>
                <Button onClick={() => setShowCampaignModal(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Campaign
                </Button>
              </div>
              <div className="p-4">
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="relative w-full sm:flex-grow">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search campaigns..."
                      className="w-full rounded-md pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={campaignFilter} onValueChange={(value) => setCampaignFilter(value as any)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Campaigns</SelectItem>
                      <SelectItem value="active">Active Campaigns</SelectItem>
                      <SelectItem value="inactive">Inactive Campaigns</SelectItem>
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
                        <TableHead>Name</TableHead>
                        <TableHead>Goal</TableHead>
                        <TableHead>Raised</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCampaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell className="font-medium">{campaign.name}</TableCell>
                          <TableCell>${campaign.goal.toLocaleString()}</TableCell>
                          <TableCell>${campaign.raised.toLocaleString()}</TableCell>
                          <TableCell>{format(parseISO(campaign.startDate), "PP")}</TableCell>
                          <TableCell>{campaign.endDate ? format(parseISO(campaign.endDate), "PP") : "Ongoing"}</TableCell>
                          <TableCell>
                            <Badge variant={campaign.isActive ? "default" : "secondary"}>
                              {campaign.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleEditCampaign(campaign.id)}>
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleCampaignStatus(campaign.id, campaign.isActive)}
                              className="ml-2"
                            >
                              {campaign.isActive ? "Deactivate" : "Activate"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex min-h-[300px] items-center justify-center rounded-md border border-dashed p-4 sm:p-8 text-center">
                    <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                      <h3 className="mt-4 text-lg font-semibold">No campaigns found</h3>
                      <p className="mb-4 mt-2 text-sm text-muted-foreground">
                        {searchTerm || campaignFilter !== "all"
                          ? "Try adjusting your search or filters."
                          : "Add your first campaign to get started."}
                      </p>
                      <Button onClick={() => setShowCampaignModal(true)}>Add New Campaign</Button>
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
                    Donors
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Manage your donors</p>
                </div>
                <Button onClick={handleAddDonorClick} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Donor
                </Button>
              </div>
              <div className="p-4">
                <div className="relative w-full max-w-sm mb-4">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search donors (name, email, phone)..."
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
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
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
                          <TableCell>{format(parseISO(member.joinDate), "PP")}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDonorId(member.id)
                                setShowEditDonorModal(true)
                              }}
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex min-h-[300px] items-center justify-center rounded-md border border-dashed p-4 sm:p-8 text-center">
                    <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                      <h3 className="mt-4 text-lg font-semibold">No donors found</h3>
                      <p className="mb-4 mt-2 text-sm text-muted-foreground">
                        {donorSearchTerm
                          ? "Try adjusting your search terms."
                          : "Add your first donor to get started."}
                      </p>
                      <Button onClick={handleAddDonorClick}>Add Donor</Button>
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
        <AddDonorModal isOpen={showDonorModal} onClose={handleDonorModalClose} />
        <EditDonorModal isOpen={showEditDonorModal} onClose={handleEditDonorModalClose} donorId={selectedDonorId} />

        <DonationDetailsDrawer
          donationId={selectedDonationId}
          isOpen={showDonationDetails}
          onClose={() => setShowDonationDetails(false)}
        />
        <DonorDetailsDrawer
          donorId={selectedDonorIdForDetails}
          isOpen={showDonorDetails}
          onClose={() => setShowDonorDetails(false)}
        />
      </div>
    </TooltipProvider>
  )
}

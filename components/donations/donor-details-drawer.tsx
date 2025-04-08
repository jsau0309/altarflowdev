"use client"

import { useState } from "react"
import { format } from "date-fns"
import { User, Mail, Phone, Edit, CreditCard, FileText, Home } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { mockDataService } from "@/lib/mock-data"
import { EditDonorModal } from "@/components/modals/edit-donor-modal"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface DonorDetailsDrawerProps {
  isOpen: boolean
  onClose: () => void
  donorId: string | null
}

export function DonorDetailsDrawer({ isOpen, onClose, donorId }: DonorDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState("details")
  const [showEditModal, setShowEditModal] = useState(false)

  if (!donorId) return null

  const donor = mockDataService.getMember(donorId)
  if (!donor) return null

  const donorDonations = mockDataService.getDonations().filter((donation) => donation.donorId === donorId)

  const totalDonated = donorDonations.reduce((sum, donation) => sum + donation.amount, 0)

  const handleEditClick = () => {
    setShowEditModal(true)
  }

  const handleEditModalClose = () => {
    setShowEditModal(false)
  }

  const formatDonationMethod = (method: string) => {
    return method
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const getCampaignName = (campaignId: string) => {
    const campaign = mockDataService.getCampaign(campaignId)
    return campaign ? campaign.name : "Unknown Campaign"
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader className="space-y-0 pb-2 border-b">
            <div className="flex justify-between items-center">
              <SheetTitle>Donor Details</SheetTitle>
              <div className="pr-8">
                <Button variant="outline" size="sm" className="gap-1" onClick={handleEditClick}>
                  <Edit className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </Button>
              </div>
            </div>
          </SheetHeader>

          <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="donations">Donations</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  {donor.firstName} {donor.lastName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Donor since {format(new Date(donor.joinDate), "MMMM d, yyyy")}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Contact Information</h3>
                  <div className="grid gap-2">
                    {donor.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{donor.email}</span>
                      </div>
                    )}
                    {donor.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{donor.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Address</h3>
                  <div className="grid gap-2">
                    {donor.address ? (
                      <>
                        <div className="flex items-start gap-2">
                          <Home className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p>{donor.address}</p>
                            {donor.city && donor.state && donor.zipCode && (
                              <p>
                                {donor.city}, {donor.state} {donor.zipCode}
                              </p>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No address on file</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Donation Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-md p-3">
                      <p className="text-sm text-muted-foreground">Total Donated</p>
                      <p className="text-xl font-semibold">${totalDonated.toLocaleString()}</p>
                    </div>
                    <div className="border rounded-md p-3">
                      <p className="text-sm text-muted-foreground">Donations</p>
                      <p className="text-xl font-semibold">{donorDonations.length}</p>
                    </div>
                  </div>
                </div>

                {donor.notes && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Notes</h3>
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm">{donor.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="donations" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Donation History</h3>
                <Badge variant="outline">
                  {donorDonations.length} {donorDonations.length === 1 ? "Donation" : "Donations"}
                </Badge>
              </div>

              {donorDonations.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Method</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {donorDonations
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((donation) => (
                          <TableRow key={donation.id}>
                            <TableCell>{format(new Date(donation.date), "MMM d, yyyy")}</TableCell>
                            <TableCell className="font-medium">${donation.amount.toLocaleString()}</TableCell>
                            <TableCell>{getCampaignName(donation.campaignId)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm">{formatDonationMethod(donation.paymentMethod)}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center border rounded-md">
                  <p className="text-muted-foreground mb-2">No donations found for this donor</p>
                  <Button variant="outline" size="sm">
                    Add Donation
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <EditDonorModal isOpen={showEditModal} onClose={handleEditModalClose} donorId={donorId} />
    </>
  )
}

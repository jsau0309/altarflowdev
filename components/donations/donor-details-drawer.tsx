"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { User, Mail, Phone, CreditCard, FileText, Home, Loader2, AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getDonorDetails } from "@/lib/actions/donors.actions"
import type { DonorDetailsData } from "@/lib/types";
import { useTranslation } from "react-i18next";

interface DonorDetailsDrawerProps {
  isOpen: boolean
  onClose: () => void
  donorId: string | null
}

export function DonorDetailsDrawer({ isOpen, onClose, donorId }: DonorDetailsDrawerProps) {
  const { t } = useTranslation('donations');
  const { t: tCommon } = useTranslation('common');
  const [activeTab, setActiveTab] = useState("details")
  const [donorData, setDonorData] = useState<DonorDetailsData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && donorId) {
      const fetchDonorData = async () => {
        setIsLoading(true)
        setError(null)
        setDonorData(null) // Clear previous data
        try {
          const data = await getDonorDetails(donorId)
          if (data) {
            setDonorData(data)
          } else {
            setError(t('viewDonorDetails.errorDonorNotFound', 'Donor not found.'))
          }
        } catch (err) {
          console.error("Failed to fetch donor details:", err)
          setError(t('viewDonorDetails.errorLoadingFailed', 'Failed to load donor details. Please try again.'))
        }
        setIsLoading(false)
      }
      fetchDonorData()
    } else if (!isOpen) {
      // Reset state when drawer is closed
      setDonorData(null)
      setIsLoading(false)
      setError(null)
    }
  }, [donorId, isOpen])


  // Only count donations that were successfully processed (status === 'succeeded')
  const totalDonated = donorData?.donations
    .filter(donation => donation.status === 'succeeded')
    .reduce((sum, donation) => sum + parseFloat(donation.amount), 0) ?? 0

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-2">{t('viewDonorDetails.loadingText', 'Loading donor details...')}</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-destructive">
          <AlertTriangle className="h-8 w-8 mb-2" />
          <p className="text-center">{error}</p>
          <Button variant="outline" size="sm" onClick={onClose} className="mt-4">
            {tCommon('actions.close', 'Close')}
          </Button>
        </div>
      )
    }

    if (!donorData) {
      // This case should ideally be covered by error or loading, 
      // but as a fallback if drawer is open without donorId somehow or fetch returned null without error.
      return (
        <div className="flex items-center justify-center h-full min-h-[300px]">
            <p>{t('viewDonorDetails.noDataAvailable', 'No donor data available.')}</p>
        </div>
      );
    }

    return (
      <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="details">{t('viewDonorDetails.detailsTabLabel', 'Details')}</TabsTrigger>
          <TabsTrigger value="donations">{t('viewDonorDetails.donationsTabLabel', 'Donations')}</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              {donorData.firstName} {donorData.lastName}
            </h2>
            {donorData.joinDate && (
              <p className="text-sm text-muted-foreground">
                Donor since {format(new Date(donorData.joinDate), "MMMM d, yyyy")}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">{t('viewDonorDetails.contactInformationLabel', 'Contact Information')}</h3>
              <div className="grid gap-2">
                {donorData.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{donorData.email}</span>
                  </div>
                )}
                {donorData.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{donorData.phone}</span>
                  </div>
                )}
                {!donorData.email && !donorData.phone && (
                    <p className="text-sm text-muted-foreground">{t('viewDonorDetails.noContactInfoText', 'No contact information on file.')}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">{t('viewDonorDetails.addressLabel', 'Address')}</h3>
              <div className="grid gap-2">
                {donorData.address ? (
                  <>
                    <div className="flex items-start gap-2">
                      <Home className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p>{donorData.address}</p>
                        {(donorData.city || donorData.state || donorData.zipCode) && (
                          <p>
                            {donorData.city}{donorData.city && donorData.state ? ", " : ""}{donorData.state} {donorData.zipCode}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('viewDonorDetails.noAddressText', 'No address on file.')}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">{t('viewDonorDetails.donationSummaryLabel', 'Donation Summary')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-md p-3">
                  <p className="text-xs text-muted-foreground">{t('viewDonorDetails.totalDonatedLabel', 'Total Donated')}</p>
                  <p className="text-xl font-semibold">${totalDonated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="border rounded-md p-3">
                  <p className="text-xs text-muted-foreground">{t('viewDonorDetails.donationsCountLabel', 'Donations')}</p>
                  <p className="text-xl font-semibold">{donorData.donations.length}</p>
                </div>
              </div>
            </div>

            {donorData.linkedMemberName && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">{t('viewDonorDetails.linkedMemberLabel', 'Linked Member')}</h3>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">{donorData.linkedMemberName}</p>
                </div>
              </div>
            )}

            {donorData.notes && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">{t('viewDonorDetails.notesLabel', 'Notes')}</h3>
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm whitespace-pre-wrap">{donorData.notes}</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="donations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">{t('viewDonorDetails.donationHistoryLabel', 'Donation History')}</h3>
            <Badge variant="outline">
              {donorData.donations.length} {donorData.donations.length === 1 ? t('viewDonorDetails.donationSingular', 'Donation') : t('viewDonorDetails.donationPlural', 'Donations')}
            </Badge>
          </div>

          {donorData.donations.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('viewDonorDetails.historyTable.dateHeader', 'Date')}</TableHead>
                    <TableHead>{t('viewDonorDetails.historyTable.amountHeader', 'Amount')}</TableHead>
                    <TableHead>{t('viewDonorDetails.historyTable.campaignHeader', 'Campaign')}</TableHead>
                    {/* <TableHead>Method</TableHead> */}{/* Payment method not available in current data model */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donorData.donations
                    .sort((a, b) => new Date(b.donationDate).getTime() - new Date(a.donationDate).getTime())
                    .map((donation) => (
                      <TableRow key={donation.id}>
                        <TableCell>{format(new Date(donation.donationDate), "MMM d, yyyy")}</TableCell>
                        <TableCell className="font-medium">${parseFloat(donation.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell>{donation.donationType ? donation.donationType.name : "N/A"}</TableCell>
                        {/* <TableCell>
                          <div className="flex items-center gap-1">
                            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{formatDonationMethod(donation.paymentMethod)}</span>
                          </div>
                        </TableCell> */}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center border rounded-md">
              <p className="text-muted-foreground mb-2">{t('viewDonorDetails.noDonationsFoundText', 'No donations found for this donor')}</p>
              {/* <Button variant="outline" size="sm">
                Add Donation
              </Button> */}{/* Add Donation functionality can be a future enhancement */}
            </div>
          )}
        </TabsContent>
      </Tabs>
    )
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader className="space-y-0 pb-2 border-b">
            <SheetTitle>{t('viewDonorDetails.title', 'Donor Details')}</SheetTitle>
          </SheetHeader>
          {renderContent()}
        </SheetContent>
      </Sheet>
    </>
  )
}

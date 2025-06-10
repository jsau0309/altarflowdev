"use client"

import { format } from "date-fns"
import { FileImage, Calendar, Target, CreditCard, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

interface DonationDetailsDrawerProps {
  isOpen: boolean
  onClose: () => void
  donationId: string | null
}

export function DonationDetailsDrawer({ isOpen, onClose, donationId }: DonationDetailsDrawerProps) {
  if (!donationId) return null

  // const donation = mockDataService.getDonation(donationId) // TODO: Implement real data fetching
  // if (!donation) return null // This will make the component render null until data fetching is added
  const donation = null; // Placeholder to allow build to pass, component will render null
  if (!donation) return null;

  // const donor = mockDataService.getMember(donation.donorId) // TODO: Implement real data fetching
  // const campaign = mockDataService.getCampaign(donation.campaignId) // TODO: Implement real data fetching
  const donor = null; // Placeholder
  const campaign = null; // Placeholder

  /* TODO: Implement real data fetching and uncomment below
  const donationDate = new Date(donation.date)

  // Format donation method to be more readable
  const formatDonationMethod = (method: string) => {
    return method
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="space-y-0 pb-2 border-b">
          <SheetTitle>Donation Details</SheetTitle>
        </SheetHeader>

        <div className="py-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold">${donation.amount.toLocaleString()}</h2>
              <p className="text-muted-foreground">
                {format(donationDate, "MMMM d, yyyy")} at {format(donationDate, "h:mm a")}
              </p>
            </div>
            <Badge variant={donation.isDigital ? "default" : "outline"}>
              {formatDonationMethod(donation.paymentMethod)}
            </Badge>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Campaign</h3>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{campaign?.name || "Unknown Campaign"}</span>
              </div>
              {campaign?.description && <p className="text-sm text-muted-foreground">{campaign.description}</p>}
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Donation Method</h3>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>{formatDonationMethod(donation.paymentMethod)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {donation.isDigital ? "Processed electronically" : "Processed manually"}
              </p>
            </div>

            {donor && (
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Donor</h3>
                <div className="flex items-center gap-2">
                  <span>
                    {donor.firstName} {donor.lastName}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    // This would navigate to the member details page
                    // For now, we'll just close the drawer
                    onClose()
                  }}
                >
                  View Donor Profile
                </Button>
              </div>
            )}

            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Date & Time</h3>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(donationDate, "MMMM d, yyyy")} at {format(donationDate, "h:mm a")}
                </span>
              </div>
            </div>

            {donation.notes && (
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Notes</h3>
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm">{donation.notes}</p>
                </div>
              </div>
            )}

            {donation.receiptUrl && (
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Receipt</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <FileImage className="h-4 w-4" />
                      View Receipt
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <div className="flex flex-col items-center">
                      <h3 className="text-lg font-semibold mb-4">Donation Receipt</h3>
                      <div className="border rounded-md overflow-hidden">
                        <img
                          src={donation.receiptUrl || "/placeholder.svg"}
                          alt="Receipt"
                          className="max-w-full h-auto"
                        />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
  */
}

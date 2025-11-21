"use client"


import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { DollarSign, Loader2, AlertTriangle, Edit, Clock, Lock, History } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useTranslation } from "react-i18next"
import { getDonationById, type DonationWithEditHistory } from "@/lib/actions/get-donation-by-id.action"
import { isDonationEditable } from "@/lib/actions/donation-edit.actions"
import { EditDonationDialog } from "./edit-donation-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface DonationDetailsDrawerProps {
  isOpen: boolean
  onClose: () => void
  donationId: string | null
  onDonationUpdated?: () => void
}

export function DonationDetailsDrawer({ isOpen, onClose, donationId, onDonationUpdated }: DonationDetailsDrawerProps) {
  const { t } = useTranslation(['donations', 'common'])
  const [donation, setDonation] = useState<DonationWithEditHistory | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditable, setIsEditable] = useState(false)
  const [editTimeRemaining, setEditTimeRemaining] = useState<string | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const fetchDonationDetails = useCallback(async () => {
    if (!donationId) return

    setIsLoading(true)
    setError(null)

    try {
      // Fetch the specific donation
      const foundDonation = await getDonationById(donationId)
      
      if (foundDonation) {
        setDonation(foundDonation)
        
        // Check if editable (only for manual donations)
        if (foundDonation.source === 'manual') {
          const editableStatus = await isDonationEditable(donationId)
          setIsEditable(editableStatus.editable)
          setEditTimeRemaining(editableStatus.timeRemaining || null)
        }
      } else {
        setError(t('common:errors.notFound', 'Donation not found'))
      }
    } catch (err) {
      console.error("Failed to fetch donation details", { operation: "ui.donation.fetch_error" }, err instanceof Error ? err : new Error(String(err)))
      setError(t('common:errors.fetchFailed', 'Failed to load donation details'))
    } finally {
      setIsLoading(false)
    }
  }, [donationId, t])

  useEffect(() => {
    if (isOpen && donationId) {
      fetchDonationDetails()
    } else if (!isOpen) {
      // Reset state when drawer closes
      setDonation(null)
      setIsLoading(false)
      setError(null)
      setIsEditable(false)
      setEditTimeRemaining(null)
    }
  }, [isOpen, donationId, fetchDonationDetails])

  const handleEditSuccess = () => {
    setShowEditDialog(false)
    fetchDonationDetails() // Refresh the drawer data
    onDonationUpdated?.() // Notify parent to refresh list
  }

  const getStripePaymentMethodDisplayName = (stripeType: string): string => {
    const stripeMethodMap: Record<string, string> = {
      'card': 'Card',
      'us_bank_account': 'Bank Account',
      'link': 'Link',
    };
    return stripeMethodMap[stripeType] || stripeType;
  };

  const getTranslatedPaymentMethodName = (donation: DonationWithEditHistory): string => {
    // For Stripe donations (no paymentMethodId), use Stripe payment method type
    if (donation.source === 'stripe' && !donation.paymentMethodId) {
      const displayName = getStripePaymentMethodDisplayName(donation.paymentMethodType);
      const key = `donations:stripePaymentMethods.${displayName.toLowerCase().replace(' ', '')}`;
      const translated = t(key, displayName);
      return translated === key ? displayName : translated;
    }

    // For manual donations with paymentMethodId
    if (donation.paymentMethod?.name) {
      const key = `settings:systemCategories.paymentMethods.${donation.paymentMethod.name}`;
      const translated = t(key, donation.paymentMethod.name);
      return translated === key ? donation.paymentMethod.name : translated;
    }

    return donation.paymentMethodType;
  };

  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      'succeeded': '#3B82F6',      // Blue
      'completed': '#3B82F6',      // Blue
      'pending': '#94A3B8',        // Gray
      'processing': '#F59E0B',     // Amber
      'failed': '#EF4444',         // Red
      'refunded': '#8B5CF6',       // Purple
      'partially_refunded': '#A855F7', // Violet
      'canceled': '#6B7280',       // Gray
      'disputed': '#DC2626',       // Dark red
    };
    return statusColors[status] || '#94A3B8';
  };

  const getTranslatedStatus = (donation: DonationWithEditHistory): string => {
    // All succeeded donations show "Completed"
    if (donation.status === 'succeeded') {
      return t('donations:statuses.completed', 'Completed');
    }

    const statusKey = donation.status === 'partially_refunded' ? 'partiallyRefunded' : donation.status;
    return t(`donations:statuses.${statusKey}`, donation.status);
  };

  const getSourceColor = (source: string): string => {
    return source === 'manual' ? '#10B981' : '#000000'; // Green for manual, Black for Stripe
  };

  const getTranslatedSource = (source: string): string => {
    if (source === 'manual') {
      return t('common:manual', 'Manual');
    }
    return 'Stripe';
  };

  const getTranslatedDonationTypeName = (typeName: string): string => {
    const systemTypes: Record<string, string> = {
      'Tithe': 'tithe',
      'Offering': 'offering',
    };

    if (systemTypes[typeName]) {
      const key = `donations:types.${systemTypes[typeName]}`;
      return t(key, typeName);
    }

    return typeName; // For custom campaigns
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-[400px]">
          <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-center text-destructive">{error}</p>
        </div>
      )
    }

    if (!donation) {
      return null
    }

    return (
      <ScrollArea className="h-[calc(100vh-120px)]">
        <div className="space-y-6 pr-4 pt-4">
          {/* Edit Status Banner */}
          {donation.source === 'manual' && (
            <div className={`p-3 rounded-lg ${isEditable ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900' : 'bg-muted border border-border'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isEditable ? (
                    <>
                      <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                        {t('donations:donationDetailsDrawer.editableFor')} {editTimeRemaining}
                      </span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">
                        {t('donations:donationDetailsDrawer.locked')}
                      </span>
                    </>
                  )}
                </div>
                {isEditable && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowEditDialog(true)}
                    className="gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    {t('donations:donationDetailsDrawer.editDonation')}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Main Details */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3">{t('donations:donationDetailsDrawer.donationInfo')}</h3>
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('donations:donationDetailsDrawer.amount')}</span>
                  <span className="font-medium text-lg">${donation.amount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('donations:donationDetailsDrawer.type')}</span>
                  <span>{getTranslatedDonationTypeName(donation.donationTypeName)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('donations:donationDetailsDrawer.date')}</span>
                  <span>{format(new Date(donation.transactionDate), 'PPP')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('donations:donationDetailsDrawer.method')}</span>
                  <div className="flex items-center gap-2">
                    {donation.source === 'stripe' ? (
                      <div className="w-3 h-3 rounded-full bg-foreground" />
                    ) : (
                      donation.paymentMethod?.color && (
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: donation.paymentMethod.color }} />
                      )
                    )}
                    <span>{getTranslatedPaymentMethodName(donation)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('donations:donationDetailsDrawer.status')}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusColor(donation.status) }} />
                    <span>{getTranslatedStatus(donation)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('donations:donationDetailsDrawer.source')}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getSourceColor(donation.source || 'stripe') }} />
                    <span>{getTranslatedSource(donation.source || 'stripe')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Refund Information */}
            {donation.refundedAmount && donation.refundedAmount > 0 ? (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-destructive">Refund Information</h3>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Refunded Amount</span>
                      <span className="font-medium text-destructive">
                        -${(donation.refundedAmount / 100).toFixed(2)}
                      </span>
                    </div>
                    {donation.refundedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Refunded On</span>
                        <span>{format(new Date(donation.refundedAt), 'PP')}</span>
                      </div>
                    )}
                    {donation.status === 'partially_refunded' && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Remaining Amount</span>
                        <span className="font-medium">
                          ${((parseInt(donation.amount) * 100 - (donation.refundedAmount || 0)) / 100).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : null}

            {/* Dispute Information */}
            {donation.disputeStatus ? (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-destructive">Dispute Information</h3>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Dispute Status</span>
                      <Badge 
                        variant={
                          donation.disputeStatus === 'won' ? 'default' :
                          donation.disputeStatus === 'lost' ? 'destructive' :
                          donation.disputeStatus === 'needs_response' ? 'destructive' :
                          'outline'
                        }
                      >
                        {donation.disputeStatus === 'needs_response' ? '⚠️ Response Needed' :
                         donation.disputeStatus === 'under_review' ? '🔍 Under Review' :
                         donation.disputeStatus === 'won' ? '✅ Won' :
                         donation.disputeStatus === 'lost' ? '❌ Lost' :
                         donation.disputeStatus}
                      </Badge>
                    </div>
                    {donation.disputeReason && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Reason</span>
                        <span className="text-sm">{donation.disputeReason}</span>
                      </div>
                    )}
                    {donation.disputedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Disputed On</span>
                        <span>{format(new Date(donation.disputedAt), 'PP')}</span>
                      </div>
                    )}
                    {donation.disputeStatus === 'needs_response' && (
                      <div className="p-3 bg-destructive/10 rounded-md">
                        <p className="text-sm text-destructive">
                          ⚠️ This dispute requires immediate attention. Please respond in your Stripe Express Dashboard.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : null}

            <Separator />

            {/* Donor Details */}
            <div>
              <h3 className="text-lg font-semibold mb-3">{t('donations:donationDetailsDrawer.donorInfo')}</h3>
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('donations:donationDetailsDrawer.name')}</span>
                  <span>
                    {donation.donorName === "General Collection"
                      ? t('donations:generalCollection')
                      : donation.donorName || t('common:anonymous', 'Anonymous')}
                  </span>
                </div>
                {/* Hide email for anonymous donors to maintain privacy */}
                {donation.donorEmail && !donation.isAnonymous && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('donations:donationDetailsDrawer.email')}</span>
                    <span className="text-sm">{donation.donorEmail}</span>
                  </div>
                )}
                {donation.isInternational && donation.donorCountry && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('donations:donationDetailsDrawer.country')}</span>
                    <span className="text-sm">{donation.donorCountry}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Edit History */}
            {donation.source === 'manual' && donation.updatedAt !== donation.createdAt && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <History className="h-4 w-4" />
                    <h3 className="text-lg font-semibold">{t('donations:donationDetailsDrawer.editHistory')}</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      {t('donations:donationDetailsDrawer.lastEdited')}: {format(new Date(donation.updatedAt), 'PPp')}
                    </div>
                    {donation.editReason && (
                      <div className="p-3 bg-muted rounded-md border border-border">
                        <p className="text-sm font-medium">{t('donations:donationDetailsDrawer.editReason')}:</p>
                        <p className="text-sm text-muted-foreground mt-1">{donation.editReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Transaction Details */}
            {donation.stripePaymentIntentId && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-3">{t('donations:donationDetailsDrawer.transactionDetails')}</h3>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('donations:donationDetailsDrawer.transactionId')}</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm font-mono truncate max-w-[150px]">
                              {donation.stripePaymentIntentId}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{donation.stripePaymentIntentId}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    {donation.processedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('donations:donationDetailsDrawer.processed')}</span>
                        <span className="text-sm">
                          {format(new Date(donation.processedAt), 'PPp')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </ScrollArea>
    )
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t('donations:donationDetailsDrawer.title')}
            </SheetTitle>
          </SheetHeader>
          {renderContent()}
        </SheetContent>
      </Sheet>

      {donation && (
        <EditDonationDialog
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          onSuccess={handleEditSuccess}
          donation={donation}
        />
      )}
    </>
  )
}
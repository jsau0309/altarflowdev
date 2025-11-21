"use client"


import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, DollarSign, Clock, Infinity } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Campaign {
  id: string
  name: string
  description: string
  goal: number
  startDate: string
  endDate: string | null
  isActive: boolean
  allowRecurring: boolean
  recurringOptions?: {
    frequencies: FrequencyOption[]
    maxAmount: number | null
  }
}

interface CampaignModalProps {
  isOpen: boolean
  onClose: () => void
  campaignId?: string // If provided, we're editing an existing campaign
}

type FrequencyOption = "weekly" | "monthly" | "quarterly" | "annually"

interface FormData {
  name: string
  description: string
  maxAmount: string
  startDate?: string
}

export function CampaignModal({ isOpen, onClose, campaignId }: CampaignModalProps) {
  const router = useRouter()
  const { t } = useTranslation('campaigns')
  const [isLoading, setIsLoading] = useState(false)
  const [campaignType, setCampaignType] = useState<"tithe" | "general">("tithe")
  const [allowRecurring, setAllowRecurring] = useState(true)
  const [hasMaxAmount, setHasMaxAmount] = useState(false)

  // Track selected frequencies with a state object
  const [selectedFrequencies, setSelectedFrequencies] = useState<Record<FrequencyOption, boolean>>({
    weekly: false,
    monthly: true, // Default to monthly selected
    quarterly: false,
    annually: false,
  })

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    maxAmount: "",
  })

  // Load campaign data if editing
  useEffect(() => {
    if (campaignId && isOpen) {
      // TODO: Replace with actual API call to fetch campaign data
      const fetchCampaign = async () => {
        try {
          // const fetchedCampaign = await getCampaign(campaignId);
          // For now using placeholder empty data
          const fetchedCampaign: Campaign | null = null;
          
          if (fetchedCampaign) {
            const campaign: Campaign = fetchedCampaign; // Explicitly assign non-null type

            const formDataFromCampaign: FormData = {
              name: campaign.name,
              description: campaign.description,
              maxAmount: campaign.recurringOptions?.maxAmount?.toString() || "",
              startDate: campaign.startDate,
            }
            setFormData(formDataFromCampaign)

            setCampaignType(campaign.name.toLowerCase().includes("tithe") ? "tithe" : "general")
            setAllowRecurring(campaign.allowRecurring)
            setHasMaxAmount(!!campaign.recurringOptions?.maxAmount)

            // Set selected frequencies based on campaign data
            if (campaign.recurringOptions?.frequencies) {
              const newFrequencies = {
                weekly: false,
                monthly: false,
                quarterly: false,
                annually: false,
              }

              campaign.recurringOptions.frequencies.forEach((freq: FrequencyOption) => {
                newFrequencies[freq] = true
              })

              setSelectedFrequencies(newFrequencies)
            }
          }
        } catch (error) {
          console.error('Error fetching campaign:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
          // TODO: Show error toast
        }
      }
      fetchCampaign()
    }
  }, [campaignId, isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleFrequencyChange = (frequency: FrequencyOption, checked: boolean) => {
    setSelectedFrequencies((prev) => ({
      ...prev,
      [frequency]: checked,
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    // Get selected frequencies as an array
    const frequencies = Object.entries(selectedFrequencies)
      .filter(([_freq, isSelected]) => isSelected)
      .map(([freq]) => freq) as FrequencyOption[]

    // Ensure at least one frequency is selected if recurring is enabled
    if (allowRecurring && frequencies.length === 0) {
      alert(t('campaigns:campaignModal.errors.selectFrequency'))
      setIsLoading(false)
      return
    }

    // Set name and description based on campaign type
    const name = campaignType === "tithe" ? t('campaigns:campaignModal.tithe') : t('campaigns:campaignModal.generalOffering')
    const description =
      campaignType === "tithe"
        ? t('campaigns:campaignModal.titheDescription')
        : t('campaigns:campaignModal.generalOfferingDescription')

    // Prepare campaign data
    const campaignData = {
      name,
      description,
      goal: 0, // No specific goal for these ongoing campaigns
      startDate: formData.startDate || new Date().toISOString().split("T")[0],
      endDate: null, // No end date for these ongoing campaigns
      isActive: true,
      allowRecurring,
      recurringOptions: allowRecurring
        ? {
            frequencies: frequencies,
            maxAmount: hasMaxAmount ? Number.parseFloat(formData.maxAmount) || 0 : null,
          }
        : undefined,
    }

    try {
      // TODO: Replace with actual API call
      if (campaignId) {
        // await updateCampaign(campaignId, campaignData)
        // Debug logging removed: updating campaign
      } else {
        // await createCampaign(campaignData)
        // Debug logging removed: creating new campaign
      }

      // Simulate API call
      setTimeout(() => {
        setIsLoading(false)
        onClose()
        // Refresh the campaigns page
        router.refresh()
      }, 1000)
    } catch (error) {
      console.error('Error saving campaign:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
      setIsLoading(false)
      // TODO: Show error toast
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      maxAmount: "",
    })
    setCampaignType("tithe")
    setAllowRecurring(true)
    setHasMaxAmount(false)
    setSelectedFrequencies({
      weekly: false,
      monthly: true,
      quarterly: false,
      annually: false,
    })
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          resetForm()
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{campaignId ? t('campaigns:campaignModal.editTitle') : t('campaigns:campaignModal.newTitle')}</DialogTitle>
          <DialogDescription>
            {campaignId ? t('campaigns:campaignModal.editDescription') : t('campaigns:campaignModal.newDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="campaignType">{t('campaigns:campaignModal.donationTypeLabel')}</Label>
            <Select value={campaignType} onValueChange={(value) => setCampaignType(value as "tithe" | "general")}>
              <SelectTrigger>
                <SelectValue placeholder={t('campaigns:campaignModal.donationTypePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tithe">{t('campaigns:campaignModal.tithe')}</SelectItem>
                <SelectItem value="general">{t('campaigns:campaignModal.generalOffering')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4 border rounded-md p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="allow-recurring" className="font-medium">
                  {t('campaigns:campaignModal.allowRecurringLabel')}
                </Label>
              </div>
              <Switch id="allow-recurring" checked={allowRecurring} onCheckedChange={setAllowRecurring} />
            </div>

            {allowRecurring && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>{t('campaigns:campaignModal.recurringFrequencyLabel')}</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    {t('campaigns:campaignModal.recurringFrequencyDescription')}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="weekly"
                        checked={selectedFrequencies.weekly}
                        onCheckedChange={(checked) => handleFrequencyChange("weekly", checked === true)}
                      />
                      <Label htmlFor="weekly">{t('campaigns:campaignModal.frequencyOptions.weekly')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="monthly"
                        checked={selectedFrequencies.monthly}
                        onCheckedChange={(checked) => handleFrequencyChange("monthly", checked === true)}
                      />
                      <Label htmlFor="monthly">{t('campaigns:campaignModal.frequencyOptions.monthly')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="quarterly"
                        checked={selectedFrequencies.quarterly}
                        onCheckedChange={(checked) => handleFrequencyChange("quarterly", checked === true)}
                      />
                      <Label htmlFor="quarterly">{t('campaigns:campaignModal.frequencyOptions.quarterly')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="annually"
                        checked={selectedFrequencies.annually}
                        onCheckedChange={(checked) => handleFrequencyChange("annually", checked === true)}
                      />
                      <Label htmlFor="annually">{t('campaigns:campaignModal.frequencyOptions.annually')}</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="maxAmount">{t('campaigns:campaignModal.maxAmountLabel')}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch id="has-max-amount" checked={hasMaxAmount} onCheckedChange={setHasMaxAmount} />
                      <Label htmlFor="has-max-amount" className="text-sm">
                        {t('campaigns:campaignModal.setLimitLabel')}
                      </Label>
                    </div>
                  </div>

                  {hasMaxAmount ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{t('campaigns:campaignModal.currencySymbol')}</span>
                      <Input
                        id="maxAmount"
                        type="number"
                        value={formData.maxAmount}
                        onChange={handleChange}
                        placeholder={t('campaigns:campaignModal.maxAmountPlaceholder')}
                        className="pl-8"
                        step="0.01"
                        min="0"
                        required={hasMaxAmount}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/20">
                      <Infinity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{t('campaigns:campaignModal.unlimited')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('campaigns:campaignModal.cancelButton')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {campaignId ? t('campaigns:campaignModal.updating') : t('campaigns:campaignModal.saving')}
                </>
              ) : campaignId ? (
                t('campaigns:campaignModal.updateButton')
              ) : (
                t('campaigns:campaignModal.saveButton')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

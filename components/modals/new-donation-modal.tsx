"use client"

import { DialogFooter } from "@/components/ui/dialog"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Loader2, X, Receipt, Plus, Upload, Trash2, Info } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ReceiptScannerButton } from "@/components/receipt-scanner/receipt-scanner-button"
import { Member, Campaign, Donation } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"
import { useTranslation } from "react-i18next"

interface NewDonationModalProps {
  isOpen: boolean
  onClose: () => void
  fromDashboard?: boolean
  initialData?: Partial<Donation>
}

const initialFormData: Omit<Partial<Donation>, "amount"> & { amount: string } = {
  amount: "",
  date: new Date().toISOString().split("T")[0],
  donorId: "",
  campaignId: "",
  paymentMethod: "",
  notes: "",
}

export function NewDonationModal({ isOpen, onClose, fromDashboard = false, initialData }: NewDonationModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useTranslation('donations')
  const [isLoading, setIsLoading] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [showNewDonorForm, setShowNewDonorForm] = useState(false)
  const [formData, setFormData] = useState(() => ({
    ...initialFormData,
    ...(initialData || {}),
    amount: initialData?.amount?.toString() ?? "",
  }))
  const [newDonor, setNewDonor] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  })
  const [selectedDonor, setSelectedDonor] = useState<Member | null>(null)

  // Photo/receipt related states
  const [receiptImage, setReceiptImage] = useState<string | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  // const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      // TODO: Replace with API call to fetch members and campaigns
      const fetchData = async () => {
        try {
          // const [fetchedMembers, fetchedCampaigns] = await Promise.all([
          //   getMembers(),
          //   getCampaigns()
          // ]);
          const fetchedMembers: Member[] = []; // Placeholder
          const fetchedCampaigns: Campaign[] = []; // Placeholder
          setMembers(fetchedMembers)
          setCampaigns(fetchedCampaigns)
        } catch (error) {
          console.error("Error fetching data:", error)
          toast({
            description: t('donations:newDonationModal.errors.failedToLoadData'),
            variant: "destructive"
          })
        }
      }
      fetchData()
    }
  }, [isOpen, toast, t])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleDonorChange = (value: string) => {
    if (value === "new") {
      setShowNewDonorForm(true)
      setFormData((prev) => ({ ...prev, donorId: "" }))
    } else {
      setShowNewDonorForm(false)
      setFormData((prev) => ({ ...prev, donorId: value }))
    }
  }

  const handleNewDonorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setNewDonor((prev) => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    let donorId = formData.donorId

    // If adding a new donor, create the donor first
    if (showNewDonorForm) {
      if (!newDonor.firstName || !newDonor.lastName) {
        toast({
          description: t('donations:newDonationModal.errors.missingNewDonorName'),
          variant: "destructive"
        })
        setIsLoading(false)
        return
      }

      try {
        // TODO: Replace with actual API call
        // const createdDonor = await createDonor(newDonor);
        // donorId = createdDonor.id;
        console.log("Creating new donor:", newDonor)
      } catch (error) {
        console.error("Error creating donor:", error)
        toast({
          description: t('donations:newDonationModal.errors.failedToCreateDonor'),
          variant: "destructive"
        })
        setIsLoading(false)
        return
      }
    }

    const donorIdToSave = showNewDonorForm ? donorId : formData.donorId

    // Ensure donorIdToSave is valid before proceeding
    if (!donorIdToSave) {
      toast({
        description: t('donations:newDonationModal.errors.selectOrAddDonor'),
        variant: "destructive"
      })
      setIsLoading(false)
      return
    }

    const parsedAmount = Number.parseFloat(formData.amount || "0")
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({
        description: t('donations:newDonationModal.errors.invalidAmount'),
        variant: "destructive"
      })
      setIsLoading(false)
      return
    }

    const donationPayload = {
      ...formData,
      amount: parsedAmount,
      donorId: donorIdToSave,
      isDigital: formData.paymentMethod === "online",
      receiptUrl: receiptImage,
      date: formData.date || new Date().toISOString().split("T")[0],
    }

    try {
      // TODO: Replace with actual API call
      // await createDonation(donationPayload);
      console.log("Creating donation:", donationPayload)

      toast({
        description: t('donations:newDonationModal.success'),
      })

      // If opened from dashboard, redirect to the traditional tab
      const redirectPath = fromDashboard ? "/donations?tab=traditional" : "/donations"
      router.push(redirectPath)
      setIsLoading(false)
      onClose()
    } catch (error) {
      console.error("Error saving donation:", error)
      toast({
        description: t('donations:newDonationModal.errors.failedToSaveDonation'),
        variant: "destructive"
      })
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      amount: "",
      date: new Date().toISOString().split("T")[0],
      donorId: "",
      campaignId: "",
      paymentMethod: "",
      notes: "",
    })
    setNewDonor({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    })
    setShowNewDonorForm(false)
    setReceiptImage(null)
  }

  const handleReceiptData = (data: unknown) => {
    // Add a basic type check
    if (typeof data === 'object' && data !== null) {
      // Type assertion (use carefully, or define a specific ReceiptData type)
      const receiptData = data as Partial<{ total: string, date: string, description: string, receiptImage: string }>;

      // Auto-fill form with receipt data
      setFormData((prev) => ({
        ...prev,
        amount: receiptData.total || prev.amount,
        date: receiptData.date || prev.date,
        notes: receiptData.description || prev.notes,
      }))

      // Set receipt image if available
      if (receiptData.receiptImage) {
        setReceiptImage(receiptData.receiptImage)
      }
    }
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
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('donations:newDonationModal.title')}</DialogTitle>
          <DialogDescription>{t('donations:newDonationModal.description')}</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto pr-1">
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">{t('donations:newDonationModal.amountLabel')}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{t('donations:newDonationModal.currencySymbol')}</span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder={t('donations:newDonationModal.amountPlaceholder')}
                    className="pl-8"
                    step="0.01"
                    min="0"
                    required
                    value={formData.amount}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">{t('donations:date')}</Label>
                <Input id="date" type="date" value={formData.date} onChange={handleChange} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="donor">{t('donations:newDonationModal.donorLabel')}</Label>
              <Select
                required={!showNewDonorForm}
                value={formData.donorId}
                onValueChange={handleDonorChange}
                disabled={showNewDonorForm}
              >
                <SelectTrigger id="donor">
                  <SelectValue placeholder={showNewDonorForm ? t('donations:newDonationModal.addingNewDonor') : t('donations:newDonationModal.selectDonor')} />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">{t('donations:newDonationModal.addNewDonor')}</SelectItem>
                </SelectContent>
              </Select>

              {showNewDonorForm && (
                <div className="mt-4 p-4 border rounded-md bg-slate-50 relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-6 w-6"
                    onClick={() => setShowNewDonorForm(false)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </Button>

                  <h4 className="font-medium mb-3">{t('donations:newDonationModal.newDonorInfo')}</h4>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">{t('donations:newDonationModal.firstNameLabel')}</Label>
                      <Input
                        id="firstName"
                        value={newDonor.firstName}
                        onChange={handleNewDonorChange}
                        placeholder={t('donations:newDonationModal.firstNamePlaceholder')}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">{t('donations:newDonationModal.lastNameLabel')}</Label>
                      <Input
                        id="lastName"
                        value={newDonor.lastName}
                        onChange={handleNewDonorChange}
                        placeholder={t('donations:newDonationModal.lastNamePlaceholder')}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <Label htmlFor="email">{t('donations:newDonationModal.emailLabel')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newDonor.email || ""}
                      onChange={handleNewDonorChange}
                      placeholder={t('donations:newDonationModal.emailPlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('donations:newDonationModal.phoneLabel')}</Label>
                    <Input
                      id="phone"
                      value={newDonor.phone || ""}
                      onChange={handleNewDonorChange}
                      placeholder={t('donations:newDonationModal.phonePlaceholder')}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaign">{t('donations:newDonationModal.donationTypeLabel')}</Label>
              <Select
                required
                value={formData.campaignId}
                onValueChange={(value) => handleSelectChange("campaignId", value)}
              >
                <SelectTrigger id="campaign">
                  <SelectValue placeholder={t('donations:newDonationModal.selectDonationType')} />
                </SelectTrigger>
                <SelectContent>
                  {campaigns
                    .filter((campaign) => campaign.isActive)
                    .map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-method">{t('donations:newDonationModal.paymentMethodLabel')}</Label>
              <Select
                required
                value={formData.paymentMethod}
                onValueChange={(value) => handleSelectChange("paymentMethod", value)}
              >
                <SelectTrigger id="payment-method">
                  <SelectValue placeholder={t('donations:newDonationModal.selectPaymentMethod')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('donations:newDonationModal.paymentMethodOptions.cash')}</SelectItem>
                  <SelectItem value="check">{t('donations:newDonationModal.paymentMethodOptions.check')}</SelectItem>
                  <SelectItem value="credit-card">{t('donations:newDonationModal.paymentMethodOptions.creditCard')}</SelectItem>
                  <SelectItem value="bank-transfer">{t('donations:newDonationModal.paymentMethodOptions.bankTransfer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('donations:newDonationModal.receiptLabel')}</Label>

              {receiptImage ? (
                <div className="relative border rounded-md p-2">
                  <img
                    src={receiptImage || "/placeholder.svg"}
                    alt="Receipt"
                    className="max-h-40 mx-auto object-contain rounded-md"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background/80"
                    onClick={() => setReceiptImage(null)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove image</span>
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-md p-8 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="h-16 w-16 text-gray-400">
                      <Receipt className="h-full w-full" />
                    </div>
                  </div>
                  <p className="text-gray-500 mb-4">Add a receipt to automatically extract donation details</p>
                  <ReceiptScannerButton onDataCaptured={handleReceiptData}>{t('donations:newDonationModal.addReceiptButton')}</ReceiptScannerButton>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t('donations:newDonationModal.notesLabel')}</Label>
              <Textarea
                id="notes"
                placeholder={t('donations:newDonationModal.notesPlaceholder')}
                value={formData.notes}
                onChange={handleChange}
              />
            </div>
          </form>
        </div>

        <DialogFooter className="mt-2 pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            {t('donations:newDonationModal.cancelButton')}
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            onClick={(e) => {
              e.preventDefault()
              const form = e.currentTarget.closest("div")?.querySelector("form")
              if (form) form.requestSubmit()
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('donations:newDonationModal.saving')}
              </>
            ) : (
              t('donations:newDonationModal.saveButton')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

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
import { useTranslation } from "react-i18next"

interface Donor {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  notes: string
}

interface EditDonorModalProps {
  isOpen: boolean
  onClose: () => void
  donorId: string | null
}

interface FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  notes: string
}

export function EditDonorModal({ isOpen, onClose, donorId }: EditDonorModalProps) {
  // const router = useRouter() // Unused
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    notes: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  // Load donations namespace
  const { t } = useTranslation('donations');

  // Load donor data when modal opens
  useEffect(() => {
    if (isOpen && donorId) {
      // TODO: Replace with actual API call to fetch donor data
      const fetchDonor = async () => {
        try {
          // const fetchedDonor = await getDonor(donorId);
          // For now using placeholder empty data
          const fetchedDonor: Donor | null = null;
          
          if (fetchedDonor) {
            const donor: Donor = fetchedDonor; // Explicitly assign non-null type

            const formDataFromDonor: FormData = {
              firstName: donor.firstName,
              lastName: donor.lastName,
              email: donor.email || "",
              phone: donor.phone || "",
              address: donor.address || "",
              city: donor.city || "",
              state: donor.state || "",
              zipCode: donor.zipCode || "",
              notes: donor.notes || "",
            }
            setFormData(formDataFromDonor)
          }
        } catch (error) {
          console.error("Error fetching donor:", error)
          // TODO: Show error toast
        }
      }
      fetchDonor()
    }
  }, [isOpen, donorId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))

    // Clear error when user types
    if (errors[id]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[id]
        return newErrors
      })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = t('donations:editDonorModal.errors.firstNameRequired')
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = t('donations:editDonorModal.errors.lastNameRequired')
    }

    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = t('donations:editDonorModal.errors.invalidEmail')
    }

    if (formData.phone && !/^[\d\s$$$$\-+]+$/.test(formData.phone)) {
      newErrors.phone = t('donations:editDonorModal.errors.invalidPhone')
    }

    if (formData.zipCode && !/^\d{5}(-\d{4})?$/.test(formData.zipCode)) {
      newErrors.zipCode = t('donations:editDonorModal.errors.invalidZip')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm() || !donorId) {
      return
    }

    setIsLoading(true)

    try {
      // TODO: Replace with actual API call
      // await updateDonor(donorId, formData)
      console.log("Updating donor:", donorId, formData)

      // Simulate API call
      setTimeout(() => {
        setIsLoading(false)
        onClose()
      }, 1000)
    } catch (error) {
      console.error("Error updating donor:", error)
      setIsLoading(false)
      // TODO: Show error toast
    }
  }

  const handleCancel = () => {
    onClose() // This will close the modal and return to the donor details drawer
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setErrors({})
          onClose() // This ensures we return to the donor details drawer when the dialog is closed
        }
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('donations:editDonorModal.title')}</DialogTitle>
          <DialogDescription>{t('donations:editDonorModal.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t('donations:editDonorModal.firstNameLabel')}</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder={t('donations:editDonorModal.firstNamePlaceholder')}
                className={errors.firstName ? "border-red-500" : ""}
              />
              {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">{t('donations:editDonorModal.lastNameLabel')}</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder={t('donations:editDonorModal.lastNamePlaceholder')}
                className={errors.lastName ? "border-red-500" : ""}
              />
              {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('donations:editDonorModal.emailLabel')}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t('donations:editDonorModal.emailPlaceholder')}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('donations:editDonorModal.phoneLabel')}</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder={t('donations:editDonorModal.phonePlaceholder')}
              className={errors.phone ? "border-red-500" : ""}
            />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t('donations:editDonorModal.addressLabel')}</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={handleChange}
              placeholder={t('donations:editDonorModal.addressPlaceholder')}
              className={errors.address ? "border-red-500" : ""}
            />
            {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">{t('donations:editDonorModal.cityLabel')}</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={handleChange}
                placeholder={t('donations:editDonorModal.cityPlaceholder')}
                className={errors.city ? "border-red-500" : ""}
              />
              {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">{t('donations:editDonorModal.stateLabel')}</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={handleChange}
                placeholder={t('donations:editDonorModal.statePlaceholder')}
                className={errors.state ? "border-red-500" : ""}
              />
              {errors.state && <p className="text-xs text-red-500">{errors.state}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">{t('donations:editDonorModal.zipCodeLabel')}</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                placeholder={t('donations:editDonorModal.zipCodePlaceholder')}
                className={errors.zipCode ? "border-red-500" : ""}
              />
              {errors.zipCode && <p className="text-xs text-red-500">{errors.zipCode}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('donations:editDonorModal.notesLabel')}</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder={t('donations:editDonorModal.notesPlaceholder')}
              className={`w-full rounded-md border p-2 ${errors.notes ? "border-red-500" : "border-input"}`}
              rows={3}
            />
            {errors.notes && <p className="text-xs text-red-500">{errors.notes}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              {t('donations:editDonorModal.cancelButton')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('donations:editDonorModal.saving')}
                </>
              ) : (
                t('donations:editDonorModal.saveButton')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

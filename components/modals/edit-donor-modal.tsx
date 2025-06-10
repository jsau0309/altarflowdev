"use client"

import type React from "react"
import type { DonorDetailsData } from "@/lib/types";
import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useTranslation } from "react-i18next";
import { updateDonorDetails, UpdateDonorPayload } from "@/lib/actions/donors.actions"; // Import the action

// The Donor interface can be removed if DonorDetailsData is used directly for typing
// interface Donor {
//   id: string
//   firstName: string
//   lastName: string
//   email: string
//   phone: string
//   address: string
//   city: string
//   state: string
//   zipCode: string
//   notes: string
// }

interface EditDonorModalProps {
  isOpen: boolean;
  onClose: () => void;
  donor: DonorDetailsData | null;
  onDonorUpdate?: (updatedDonor: DonorDetailsData) => void; // Callback for successful update
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  notes: string;
  membershipStatus: DonorDetailsData['membershipStatus']; // 'Visitor' | 'Member' | 'Inactive' | null
  joinDate: string | null; // ISO string
  preferredLanguage: string | null; // 'en' | 'es' | null
}

export function EditDonorModal({ isOpen, onClose, donor, onDonorUpdate }: EditDonorModalProps) {
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
    membershipStatus: null,
    joinDate: null,
    preferredLanguage: null,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  // Load donations namespace
  const { t } = useTranslation(['donations', 'members']); // Add 'members' namespace

  // Load donor data when modal opens and donor prop is available
  useEffect(() => {
    if (isOpen && donor) {
      // Simplified mapping logic, primary responsibility is in MemberDetailsDrawer
      let currentStatus = donor.membershipStatus || null;
      const lowerCaseStatus = typeof currentStatus === 'string' ? currentStatus.toLowerCase() : null;

      if (lowerCaseStatus === "statuses.new" || lowerCaseStatus === "new") {
        currentStatus = "Visitor";
      } else if (lowerCaseStatus === "statuses.active" || lowerCaseStatus === "active") {
        currentStatus = "Member";
      } else if (currentStatus !== null && !["Visitor", "Member", "Inactive"].includes(currentStatus)) {
        // This console.warn can remain as a safeguard if data somehow bypasses MemberDetailsDrawer's mapping
        console.warn(`[EditDonorModal] Received unexpected membershipStatus "${donor.membershipStatus}" from prop. Defaulting to null.`);
        currentStatus = null;
      }

      const formDataFromDonor: FormData = {
        firstName: donor.firstName || "",
        lastName: donor.lastName || "",
        email: donor.email || "",
        phone: donor.phone || "",
        address: donor.address || "",
        city: donor.city || "",
        state: donor.state || "",
        zipCode: donor.zipCode || "",
        notes: donor.notes || "",
        membershipStatus: currentStatus as FormData['membershipStatus'],
        joinDate: donor.joinDate || null, // Expecting ISO string
        preferredLanguage: donor.preferredLanguage || null,
      };
      setFormData(formDataFromDonor);
      setErrors({});
    } else if (!isOpen) {
      // Reset form when modal is closed
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        notes: "",
        membershipStatus: null,
        joinDate: null,
        preferredLanguage: null,
      });
      setErrors({});
    }
  }, [isOpen, donor]); // Depend on donor prop

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

    if (!validateForm() || !donor?.id) { // Check for donor.id
      return
    }

    setIsLoading(true)

    try {
      // Prepare payload, ensure it matches UpdateDonorPayload
      const payload: UpdateDonorPayload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        notes: formData.notes,
        membershipStatus: formData.membershipStatus,
        joinDate: formData.joinDate, // Already an ISO string or null
        preferredLanguage: formData.preferredLanguage,
      };

      console.log('[EditDonorModal] Submitting joinDate:', formData.joinDate, 'Payload to action:', payload.joinDate);
      const result = await updateDonorDetails(donor.id, payload);

      if (result.success && result.data) {
        console.log("Donor updated successfully:", result.data);
        // TODO: Show success toast
        if (onDonorUpdate) {
          onDonorUpdate(result.data);
        }
        onClose(); // Close modal on success
      } else {
        console.error("Failed to update donor:", result.error);
        // TODO: Show error toast with result.error
        // Optionally, set form-level errors if applicable
        if (result.error) {
          setErrors(prev => ({ ...prev, form: result.error || t('donations:editDonorModal.errors.unknownError') }));
        }
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      // TODO: Show generic error toast
      setErrors(prev => ({ ...prev, form: t('donations:editDonorModal.errors.unexpectedError') }));
    } finally {
      setIsLoading(false);
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

          {/* Membership Information Section */}
          <div className="space-y-1 pt-2">
            <h4 className="font-medium text-sm text-muted-foreground">{t('members:membershipInfo.title')}</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="membershipStatus">{t('members:membershipInfo.status')}</Label>
              <Select
                value={formData.membershipStatus || ""}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, membershipStatus: value as DonorDetailsData['membershipStatus'] }))}
              >
                <SelectTrigger id="membershipStatus">
                  <SelectValue placeholder={t('members:membershipInfo.selectStatusPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Visitor">{t('members:status.Visitor', 'Visitor')}</SelectItem>
                  <SelectItem value="Member">{t('members:status.Member', 'Member')}</SelectItem>
                  <SelectItem value="Inactive">{t('members:status.Inactive', 'Inactive')}</SelectItem>
                </SelectContent>
              </Select>
              {/* TODO: Add error display for membershipStatus if needed */}
            </div>
            <div className="space-y-2">
              <Label htmlFor="joinDate">{t('members:membershipInfo.joinDate')}</Label>
              {/* Assuming you have a DatePicker component, e.g., from shadcn/ui */}
              {/* Replace with your actual DatePicker component */}
              <Input 
                type="date" 
                id="joinDate" 
                value={formData.joinDate ? formData.joinDate.split('T')[0] : ""} // Basic date input, requires YYYY-MM-DD
                onChange={(e) => {
                  if (e.target.value) {
                    const parts = e.target.value.split('-'); // YYYY-MM-DD
                    if (parts.length === 3) {
                      const year = parseInt(parts[0], 10);
                      const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
                      const day = parseInt(parts[2], 10);
                      // Construct date for noon in local timezone
                      const localDate = new Date(year, month, day, 12, 0, 0);
                      setFormData(prev => ({ ...prev, joinDate: localDate.toISOString() }));
                    } else {
                      // Handle invalid date string format if necessary, or clear
                      setFormData(prev => ({ ...prev, joinDate: null }));
                    }
                  } else {
                    setFormData(prev => ({ ...prev, joinDate: null }));
                  }
                }}
                className={errors.joinDate ? "border-red-500" : ""} 
              />
              {errors.joinDate && <p className="text-xs text-red-500">{errors.joinDate}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferredLanguage">{t('members:membershipInfo.preferredLanguage')}</Label>
            <Select
              value={formData.preferredLanguage || ""}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, preferredLanguage: value }))}
            >
              <SelectTrigger id="preferredLanguage">
                <SelectValue placeholder={t('members:membershipInfo.selectLanguagePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('members:language.en', 'English')}</SelectItem>
                <SelectItem value="es">{t('members:language.es', 'Spanish')}</SelectItem>
                {/* Add other languages as needed */}
              </SelectContent>
            </Select>
            {/* TODO: Add error display for preferredLanguage if needed */}
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

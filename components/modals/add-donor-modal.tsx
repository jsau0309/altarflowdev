"use client"

import type React from "react"

import { useState } from "react"
// import { useRouter } from "next/navigation" // Unused
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
import { Member } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "react-i18next"

interface AddMemberModalProps {
  isOpen: boolean
  onClose: () => void
}

// Omit fields generated on save (id, joinDate, membershipStatus?)
// Ensure all form fields are included
type NewMemberData = Omit<Member, "id" | "joinDate" | "membershipStatus" | "createdAt" | "updatedAt">

const initialFormState: NewMemberData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  preferredLanguage: "spanish", // Default might need review
  smsConsent: false,
  notes: null, // notes is string | null as per Member type
  ministryInvolvement: null,
  smsConsentDate: null,
  smsConsentMethod: null,
}

// Rename component to reflect its purpose
export function AddMemberModal({ isOpen, onClose }: AddMemberModalProps) {
  // const router = useRouter() // Unused
  const [isLoading, setIsLoading] = useState(false)
  const [newMember, setNewMember] = useState<NewMemberData>(initialFormState)
  const [errors, setErrors] = useState<Partial<Record<keyof NewMemberData, string>>>({})
  const { showToast } = useToast()
  // Load members namespace
  const { t } = useTranslation('members'); 

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked; // Handle checkbox
    
    setNewMember((prev) => ({
       ...prev,
       [name]: type === 'checkbox' ? checked : value 
    }))

    // Clear error when user types
    if (errors[name as keyof NewMemberData]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name as keyof NewMemberData]
        return newErrors
      })
    }
  }

  // Simple validation (can be expanded)
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof NewMemberData, string>> = {}

    if (!newMember.firstName.trim()) {
      // Using key from members.json
      newErrors.firstName = t('memberForm.personalInfo.firstName') + " is required"; // Assuming validation messages aren't fully translated yet
    }
    if (!newMember.lastName.trim()) {
      // Using key from members.json
      newErrors.lastName = t('memberForm.personalInfo.lastName') + " is required";
    }
    if (newMember.email && !/^\S+@\S+\.\S+$/.test(newMember.email)) {
      // Using key from members.json
      newErrors.email = t('memberForm.errors.invalidEmail') || "Invalid email format"; // Fallback if key missing
    }
    // Add other validation rules as needed (phone, zip, etc.)

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)

    try {
      // --- TODO: Replace with actual API call to save the member --- 
      // Debug logging removed: submitting new member data
      // Example: const response = await fetch('/api/members', { method: 'POST', body: JSON.stringify(newMember) });
      // if (!response.ok) throw new Error('Failed to add member');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      // --- End of TODO section --- 

      // Using keys from members.json
      showToast(t('memberForm.submissionSuccess', { firstName: newMember.firstName, lastName: newMember.lastName }), "success")
      resetForm()
      onClose()
      // Optionally navigate or refresh data
      // router.refresh(); // If using Next.js App Router data fetching
    } catch (error) {
      console.error("Failed to add member:", error)
      // Using key from members.json
      showToast(t('memberForm.errorMessage') || "Failed to add member", "error") // Fallback
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setNewMember(initialFormState)
    setErrors({})
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
      {/* Consider using a different width if needed sm:max-w-[600px] */}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
           {/* Using key from members.json */}
          <DialogTitle>{t('newMember')}</DialogTitle>
          <DialogDescription>
             {/* Assuming a key exists, otherwise add one */}
            {t('memberForm.formSubtitle')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-medium mb-2">{t('memberForm.personalInfo.title')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="firstName">{t('memberForm.personalInfo.firstName')} *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={newMember.firstName ?? ""}
                  onChange={handleChange}
                  placeholder={t('memberForm.personalInfo.firstName')}
                  className={errors.firstName ? "border-red-500" : ""}
                  required
                  disabled={isLoading}
                />
                {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName">{t('memberForm.personalInfo.lastName')} *</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={newMember.lastName ?? ""}
                  onChange={handleChange}
                  placeholder={t('memberForm.personalInfo.lastName')}
                  className={errors.lastName ? "border-red-500" : ""}
                  required
                  disabled={isLoading}
                />
                {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-medium mb-2">{t('contactInformation')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="phone">{t('memberForm.personalInfo.phone')}</Label>
                 <Input
                   id="phone"
                   name="phone"
                   value={newMember.phone ?? ""}
                   onChange={handleChange}
                   placeholder="(555) 123-4567"
                   className={errors.phone ? "border-red-500" : ""}
                   disabled={isLoading}
                 />
                 {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">{t('memberForm.personalInfo.email')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={newMember.email ?? ""}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className={errors.email ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                 {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>
            </div>
          </div>
          
           {/* Address Info - Use top-level keys from members namespace */}
           <div>
             <h3 className="text-lg font-medium mb-2">{t('address')}</h3>
             <div className="space-y-1 mb-4">
               <Label htmlFor="address">{t('address')}</Label>
               <Input id="address" name="address" value={newMember.address ?? ""} onChange={handleChange} placeholder={t('memberForm.addressPlaceholder', "123 Main St")} disabled={isLoading} />
             </div>
             <div className="grid grid-cols-3 gap-4">
               <div className="space-y-1">
                  {/* Use top-level key */}
                 <Label htmlFor="city">{t('city')}</Label>
                 <Input id="city" name="city" value={newMember.city ?? ""} onChange={handleChange} placeholder={t('memberForm.cityPlaceholder', "City")} disabled={isLoading} />
               </div>
               <div className="space-y-1">
                  {/* Use top-level key */}
                 <Label htmlFor="state">{t('state')}</Label>
                 <Input id="state" name="state" value={newMember.state ?? ""} onChange={handleChange} placeholder={t('memberForm.statePlaceholder', "State")} disabled={isLoading} />
               </div>
               <div className="space-y-1">
                  {/* Use top-level key */}
                 <Label htmlFor="zipCode">{t('zipCode')}</Label>
                 <Input id="zipCode" name="zipCode" value={newMember.zipCode ?? ""} onChange={handleChange} placeholder={t('memberForm.zipPlaceholder', "12345")} disabled={isLoading} />
               </div>
             </div>
           </div>

           {/* Member Details */}
           <div>
             <h3 className="text-lg font-medium mb-2">{t('memberDetails', "Member Details")} {/* Fallback added */}</h3>
              <div className="grid grid-cols-2 gap-4">
                 {/* Membership Status - Assuming Select component usage */}
                 <div className="space-y-1">
                   <Label htmlFor="membershipStatus">{t('status')}</Label>
                   {/* Replace with actual Select component if needed */}
                    <Input id="membershipStatus" name="membershipStatus" placeholder="Select Status" disabled={isLoading} /> 
                 </div>
                  {/* Preferred Language - Assuming Select component usage */}
                 <div className="space-y-1">
                   <Label htmlFor="preferredLanguage">{t('preferredLanguage')}</Label>
                   {/* Replace with actual Select component if needed */}
                   <Input id="preferredLanguage" name="preferredLanguage" value={newMember.preferredLanguage ?? ""} onChange={handleChange} placeholder="Select Language" disabled={isLoading} />
                 </div>
               </div>
           </div>

           {/* SMS Consent */}
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox"
                id="smsConsent"
                name="smsConsent"
                checked={newMember.smsConsent}
                onChange={handleChange} 
                disabled={isLoading}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <Label htmlFor="smsConsent" className="text-sm font-medium text-gray-700">
                {t('memberForm.personalInfo.smsConsentLabel')} {t('smsConsentConfirmation', "By checking this box, you confirm the member has consented to receive text messages.")} {/* Fallback added */}
              </Label>
            </div>

          <DialogFooter>
            {/* Using key from common.json */}
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              {t('common:cancel')}
            </Button>
            {/* Using key from members.json */}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('memberForm.submitting') : t('memberForm.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

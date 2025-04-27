"use client"

import type React from "react"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

// Define and Export the expected structure of formData
export interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  membershipStatus: string;
  language: string;
  joinDate: string | null;
}

interface EditMemberFormProps {
  formData: FormData; // Receive form data as prop
  onFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void; // Receive change handler
  phoneError: string | null; // Receive phone error
  emailError: string | null; // Receive email error
  t: (key: string, options?: any) => string; // Receive translation function
}

// Make it a functional component receiving props
export function EditMemberForm({ formData, onFormChange, phoneError, emailError, t }: EditMemberFormProps) {
  // Removed internal state, handlers, and buttons

  return (
    // The wrapping <form> tag will be handled by the parent (MemberDetailsDrawer)
    <div className="space-y-6 p-4"> {/* Add padding here if needed, or manage in parent */}
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">{t('members:Basic Information')}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">{t('members:firstName')} *</Label>
            <Input
              id="firstName"
              name="firstName" // Add name attribute for the handler
              value={formData.firstName}
              onChange={onFormChange} // Use prop handler
              placeholder={t('common:placeholders.enterFirstName')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">{t('members:lastName')} *</Label>
            <Input
              id="lastName"
              name="lastName" // Add name attribute
              value={formData.lastName}
              onChange={onFormChange} // Use prop handler
              placeholder={t('common:placeholders.enterLastName')}
              required
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">{t('members:contactInformation')}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">{t('members:phone')}</Label>
            <Input
              id="phone"
              name="phone" // Add name attribute
              type="tel"
              value={formData.phone}
              onChange={onFormChange} // Use prop handler
              placeholder={t('common:placeholders.phoneExample')}
              maxLength={10}
              aria-describedby="phone-error-edit"
            />
            {phoneError && <p id="phone-error-edit" className="text-sm text-destructive">{t(phoneError)}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('members:email')}</Label>
            <Input
              id="email"
              name="email" // Add name attribute
              type="email"
              value={formData.email}
              onChange={onFormChange} // Use prop handler
              placeholder={t('common:placeholders.emailExample')}
              aria-describedby="email-error-edit"
            />
            {emailError && <p id="email-error-edit" className="text-sm text-destructive">{t(emailError)}</p>}
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">{t('members:address')}</h3>
        <div className="space-y-2">
          <Label htmlFor="address">{t('common:streetAddress')}</Label>
          <Input
            id="address"
            name="address" // Add name attribute
            value={formData.address}
            onChange={onFormChange} // Use prop handler
            placeholder={t('common:placeholders.streetExample')}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">{t('members:city')}</Label>
            <Input
              id="city"
              name="city" // Add name attribute
              value={formData.city}
              onChange={onFormChange} // Use prop handler
              placeholder={t('common:placeholders.city')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">{t('members:state')}</Label>
            <Input
              id="state"
              name="state" // Add name attribute
              value={formData.state}
              onChange={onFormChange} // Use prop handler
              placeholder={t('common:placeholders.state')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zipCode">{t('members:zipCode')}</Label>
            <Input
              id="zipCode"
              name="zipCode" // Add name attribute
              value={formData.zipCode}
              onChange={onFormChange} // Use prop handler
              placeholder={t('common:placeholders.zipExample')}
            />
          </div>
        </div>
      </div>

      {/* Member Details */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">{t('members:membershipInformation')}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="membershipStatus">{t('members:status')}</Label>
            <select
              id="membershipStatus"
              name="membershipStatus" // Add name attribute
              value={formData.membershipStatus}
              onChange={onFormChange} // Use prop handler
              required
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="new">{t('members:statuses.new')}</option>
              <option value="active">{t('members:statuses.active')}</option>
              <option value="visitor">{t('members:statuses.visitor')}</option>
              <option value="inactive">{t('members:statuses.inactive')}</option>
            </select>
          </div>

          {/* Join Date Input */}
          <div className="space-y-2">
            <Label htmlFor="joinDate">{t('members:joinDate', 'Join Date')}</Label>
            <Input 
              id="joinDate" 
              name="joinDate" 
              type="date" 
              value={formData.joinDate || ""} // Use string value, default to empty string if null
              onChange={onFormChange} // Use standard change handler
            />
          </div>
          {/* End Join Date Input */}

          <div className="space-y-2">
            <Label htmlFor="language">{t('members:preferredLanguage')}</Label>
            <select
              id="language"
              name="language" // Add name attribute
              value={formData.language}
              onChange={onFormChange} // Use prop handler
              required
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="spanish">{t('common:languages.spanish')}</option>
              <option value="english">{t('common:languages.english')}</option>
              <option value="both">{t('common:languages.bilingual')}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

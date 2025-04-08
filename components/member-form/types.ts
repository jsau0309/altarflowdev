export type LifeStage = "teens" | "20s" | "30s" | "40s" | "50s" | "60s" | "70plus"

export type RelationshipStatus = "visitor" | "regular"

export interface ServiceTime {
  id: string
  day: string
  time: string
  description?: string
  isActive: boolean
}

export interface Ministry {
  id: string
  name: string
  description?: string
  isActive: boolean
}

export interface CustomField {
  id: string
  fieldType: "text" | "number" | "date" | "select" | "checkbox"
  label: {
    en: string
    es: string
  }
  placeholder?: {
    en: string
    es: string
  }
  isRequired: boolean
  options?: { value: string; label: { en: string; es: string } }[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
  isActive: boolean
}

export interface FormConfiguration {
  churchId: string
  formVersion: string
  serviceTimes: ServiceTime[]
  ministries: Ministry[]
  customFields: CustomField[]
  settings: {
    enablePrayerRequests: boolean
    enableReferralTracking: boolean
    redirectUrl?: string
    notificationEmails: string[]
  }
}

export type FormConfig = {
  formTitle: string
  formSubtitle: string
  language: "en" | "es"
  showPersonalInfo: boolean
  showRelationship: boolean
  showLifeStage: boolean
  showReferral: boolean
  showPrayerRequest: boolean
  showCustomFields: boolean
  customFields: CustomField[]
  submitButtonText: string
  successMessage: string
  errorMessage: string
  churchName: string
  churchLogo: string
  primaryColor: string
  secondaryColor: string
  fontFamily: string
}

export interface MemberFormData {
  firstName: string
  lastName: string
  email: string
  phone?: string
  serviceTimes: string[]
  relationshipStatus: RelationshipStatus
  lifeStage: LifeStage
  interestedMinistries: string[]
  referralSource?: string
  prayerRequested: boolean
  prayerRequest?: string
  customFields: Record<string, any>
}

export interface Option {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  // value: string | number // Unused
}

export interface SelectFieldConfig {
  // ... existing code ...
}

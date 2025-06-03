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
    enableLifeStage: boolean
    prayerRequestNotificationEmail?: string; // Added for prayer request notifications
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
  ministries: Ministry[]
  serviceTimes: ServiceTime[]
  submitButtonText: string
  successMessage: string
  errorMessage: string
  churchName: string
  churchLogo: string
  primaryColor: string
  secondaryColor: string
  fontFamily: string;
  settings: FormConfiguration['settings']; // Add settings from the main FormConfiguration
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

// --- Add Default Exports --- 

export const defaultServiceTimes: ServiceTime[] = [
  { id: "1", day: "Sunday", time: "9:30 AM", isActive: true },
  { id: "2", day: "Sunday", time: "11:00 AM", isActive: true },
  { id: "3", day: "Thursday", time: "7:00 PM", isActive: true },
];

export const defaultMinistries: Ministry[] = [
  { id: "1", name: "Starting Point", isActive: true },
  { id: "2", name: "Growth Group", isActive: true },
  { id: "3", name: "Talking to a Pastor", isActive: true },
  { id: "4", name: "Partnership Workshop", isActive: true },
  { id: "5", name: "Baptism", isActive: true },
];

export const defaultSettings: FormConfiguration['settings'] = {
  enablePrayerRequests: false,
  enableReferralTracking: false,
  enableLifeStage: false,
  prayerRequestNotificationEmail: "", // Default for prayer request notifications
  notificationEmails: [],
};

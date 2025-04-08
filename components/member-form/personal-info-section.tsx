"use client"

import type React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { translations } from "./translations"

interface PersonalInfoSectionProps {
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  language: string
}

export function PersonalInfoSection({ handleChange, language = "en" }: PersonalInfoSectionProps) {
  // Ensure we have a valid language or fallback to English
  const t = translations[language as keyof typeof translations] || translations.en

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{t.personalInfo.title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">{t.personalInfo.firstName} *</Label>
          <Input id="firstName" name="firstName" required onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">{t.personalInfo.lastName} *</Label>
          <Input id="lastName" name="lastName" required onChange={handleChange} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t.personalInfo.email} *</Label>
        <Input id="email" name="email" type="email" required onChange={handleChange} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">{t.personalInfo.phone}</Label>
        <Input id="phone" name="phone" type="tel" onChange={handleChange} />
      </div>
    </div>
  )
}

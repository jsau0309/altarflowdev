"use client"

import type React from "react"

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { Member } from "@/lib/types"

interface EditMemberFormProps {
  member: Member
  onCancel: () => void
  onSave: (updatedMember: Member) => void
}

export function EditMemberForm({ member, onCancel, onSave }: EditMemberFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email || "",
    phone: member.phone || "",
    address: member.address || "",
    city: member.city || "",
    state: member.state || "",
    zipCode: member.zipCode || "",
    membershipStatus: member.membershipStatus,
    language: member.language,
    smsConsent: member.smsConsent,
    consentMethod: member.consentMethod || "none",
    consentNotes: member.consentNotes || "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleCheckboxChange = (field: string, checked: boolean) => {
    // If SMS consent is being unchecked, reset the consent method
    if (field === "smsConsent" && !checked) {
      setFormData((prev) => ({
        ...prev,
        [field]: checked,
        consentMethod: "none",
        consentNotes: "",
      }))
    } else {
      setFormData((prev) => ({ ...prev, [field]: checked }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      // In a real app, this would be an API call to update the member
      const updatedMember = {
        ...member,
        ...formData,
        // If SMS consent was just added, set the consent date
        smsConsentDate: formData.smsConsent && !member.smsConsent ? new Date().toISOString() : member.smsConsentDate,
      }

      setIsSubmitting(false)
      onSave(updatedMember)
    }, 500)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Edit Member</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Update member information. Fields marked with * are required.
        </p>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="Enter first name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Enter last name"
              required
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Contact Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="(555) 123-4567" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Address</h3>
        <div className="space-y-2">
          <Label htmlFor="address">Street Address</Label>
          <Input id="address" value={formData.address} onChange={handleChange} placeholder="123 Main St" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" value={formData.city} onChange={handleChange} placeholder="City" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input id="state" value={formData.state} onChange={handleChange} placeholder="State" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zipCode">Zip Code</Label>
            <Input id="zipCode" value={formData.zipCode} onChange={handleChange} placeholder="12345" />
          </div>
        </div>
      </div>

      {/* Member Details */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Member Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="membershipStatus">Membership Status</Label>
            <Select
              value={formData.membershipStatus}
              onValueChange={(value) => handleSelectChange("membershipStatus", value)}
            >
              <SelectTrigger id="membershipStatus">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="visitor">Visitor</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Preferred Language</Label>
            <Select value={formData.language} onValueChange={(value) => handleSelectChange("language", value)}>
              <SelectTrigger id="language">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spanish">Spanish</SelectItem>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="both">Bilingual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* SMS Consent */}
      <div className="space-y-4 border rounded-md p-4 bg-muted/10">
        <div className="flex items-start space-x-2">
          <Checkbox
            id="smsConsent"
            checked={formData.smsConsent}
            onCheckedChange={(checked) => handleCheckboxChange("smsConsent", checked === true)}
          />
          <div className="space-y-1">
            <Label htmlFor="smsConsent" className="font-medium">
              SMS Consent
            </Label>
            <p className="text-sm text-muted-foreground">
              By checking this box, you confirm the member has consented to receive text messages.
            </p>
          </div>
        </div>

        {formData.smsConsent && (
          <div className="pl-6 space-y-4 border-l-2 border-primary/20 mt-2">
            <div className="space-y-2">
              <Label>How was consent obtained?</Label>
              <RadioGroup
                value={formData.consentMethod}
                onValueChange={(value) => handleSelectChange("consentMethod", value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="verbal" id="consent-verbal" />
                  <Label htmlFor="consent-verbal" className="font-normal">
                    Verbal consent
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="written" id="consent-written" />
                  <Label htmlFor="consent-written" className="font-normal">
                    Written consent
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="electronic" id="consent-electronic" />
                  <Label htmlFor="consent-electronic" className="font-normal">
                    Electronic consent
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="implied" id="consent-implied" />
                  <Label htmlFor="consent-implied" className="font-normal">
                    Implied consent
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  )
}

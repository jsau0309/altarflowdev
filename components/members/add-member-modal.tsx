"use client"

import type React from "react"

import { useState } from "react"
import { Loader2, Info } from "lucide-react"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { mockDataService } from "@/lib/mock-data"

interface AddMemberModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AddMemberModal({ open, onClose, onSuccess }: AddMemberModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    membershipStatus: "new" as "active" | "visitor" | "inactive" | "new",
    language: "spanish" as "english" | "spanish" | "both",
    smsConsent: false,
    notes: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleCheckboxChange = (field: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [field]: checked }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Validate form
    if (!formData.firstName || !formData.lastName) {
      alert("First name and last name are required")
      setIsSubmitting(false)
      return
    }

    // Add the new member to our mock data service
    const newMember = {
      ...formData,
      joinDate: new Date().toISOString().split("T")[0],
      phoneVerified: false,
      welcomeMessageSent: formData.smsConsent && formData.phone ? true : false,
      welcomeMessageDate: formData.smsConsent && formData.phone ? new Date().toISOString() : undefined,
      welcomeMessageStatus: (formData.smsConsent && formData.phone ? "delivered" : undefined) as 'delivered' | undefined,
      notes: formData.notes ? [formData.notes] : [],
    }

    // Simulate API call
    setTimeout(() => {
      // Use mockDataService.createMember
      const addedMember = mockDataService.createMember(newMember)

      setIsSubmitting(false)
      resetForm()

      if (onSuccess) {
        onSuccess()
      }

      onClose()
    }, 1000)
  }

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      membershipStatus: "new",
      language: "spanish",
      smsConsent: false,
      notes: "",
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          resetForm()
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
          <DialogDescription>
            Add a new member to your church directory. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto pr-1">
          <form id="add-member-form" onSubmit={handleSubmit} className="space-y-4 py-4">
            {/* Basic Information */}
            <div className="space-y-1">
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
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(555) 123-4567"
                  />
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
            <div className="space-y-1">
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
            <div className="space-y-1">
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
            <div className="space-y-2 border rounded-md p-4 bg-muted/10">
              <div className="flex items-start space-x-2">
                <div className="pt-0.5">
                  <Checkbox
                    id="smsConsent"
                    checked={formData.smsConsent}
                    onCheckedChange={(checked) => handleCheckboxChange("smsConsent", checked === true)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="smsConsent" className="font-medium flex items-center">
                    SMS Consent
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 ml-1 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            If checked and a phone number is provided, a welcome message will be automatically sent.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    By checking this box, you confirm the member has consented to receive text messages.
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Add any additional notes about this member"
                rows={3}
              />
            </div>
          </form>
        </div>

        <DialogFooter className="mt-2 pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            onClick={() => (document.getElementById("add-member-form") as HTMLFormElement | null)?.requestSubmit()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Member"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

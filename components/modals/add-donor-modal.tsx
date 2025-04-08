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

interface AddDonorModalProps {
  isOpen: boolean
  onClose: () => void
}

// Omit fields generated on save (id, joinDate, membershipStatus?)
// Ensure all form fields are included
type NewMemberData = Omit<Member, "id" | "joinDate" | "membershipStatus">

const initialFormState: NewMemberData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  language: "spanish" as "english" | "spanish" | "both",
  smsConsent: false,
  notes: [],
}

export function AddDonorModal({ isOpen, onClose }: AddDonorModalProps) {
  // const router = useRouter() // Unused
  const [isLoading, setIsLoading] = useState(false)
  const [newDonor, setNewDonor] = useState<NewMemberData>(initialFormState)
  const [errors, setErrors] = useState<Partial<Record<keyof NewMemberData, string>>>({})
  const { showToast } = useToast()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewDonor((prev) => ({ ...prev, [name]: value }))

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

    if (!newDonor.firstName.trim()) {
      newErrors.firstName = "First name is required"
    }
    if (!newDonor.lastName.trim()) {
      newErrors.lastName = "Last name is required"
    }
    if (newDonor.email && !/^\S+@\S+\.\S+$/.test(newDonor.email)) {
      newErrors.email = "Please enter a valid email address"
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
      // --- TODO: Replace with actual API call to save the donor --- 
      console.log("Submitting new donor data:", newDonor)
      // Example: const response = await fetch('/api/donors', { method: 'POST', body: JSON.stringify(newDonor) });
      // if (!response.ok) throw new Error('Failed to add donor');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      // --- End of TODO section --- 

      showToast(`Donor ${newDonor.firstName} ${newDonor.lastName} added successfully`, "success")
      resetForm()
      onClose()
      // Optionally navigate or refresh data
      // router.refresh(); // If using Next.js App Router data fetching
    } catch (error) {
      console.error("Failed to add donor:", error)
      showToast("Failed to add donor. Please try again.", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setNewDonor(initialFormState)
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Donor</DialogTitle>
          <DialogDescription>
            Add a new donor to your database. This information will be used for donation tracking.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="firstName" className="text-right">
              First Name *
            </Label>
            <Input
              id="firstName"
              name="firstName"
              value={newDonor.firstName}
              onChange={handleChange}
              placeholder="John"
              className={`col-span-3 ${errors.firstName ? "border-red-500" : ""}`}
              required
              disabled={isLoading}
            />
            {errors.firstName && <p className="col-span-4 text-xs text-red-500 text-right">{errors.firstName}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lastName" className="text-right">
              Last Name *
            </Label>
            <Input
              id="lastName"
              name="lastName"
              value={newDonor.lastName}
              onChange={handleChange}
              placeholder="Doe"
              className={`col-span-3 ${errors.lastName ? "border-red-500" : ""}`}
              required
              disabled={isLoading}
            />
            {errors.lastName && <p className="col-span-4 text-xs text-red-500 text-right">{errors.lastName}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={newDonor.email}
              onChange={handleChange}
              placeholder="john.doe@example.com"
              className={`col-span-3 ${errors.email ? "border-red-500" : ""}`}
              disabled={isLoading}
            />
            {errors.email && <p className="col-span-4 text-xs text-red-500 text-right">{errors.email}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              Phone
            </Label>
            <Input
              id="phone"
              name="phone"
              value={newDonor.phone}
              onChange={handleChange}
              placeholder="(555) 123-4567"
              className={`col-span-3 ${errors.phone ? "border-red-500" : ""}`}
              disabled={isLoading}
            />
            {errors.phone && <p className="col-span-4 text-xs text-red-500 text-right">{errors.phone}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">Address</Label>
            <Input id="address" name="address" value={newDonor.address} onChange={handleChange} placeholder="123 Main St" className="col-span-3" disabled={isLoading} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="city" className="text-right">City</Label>
            <Input id="city" name="city" value={newDonor.city} onChange={handleChange} placeholder="Springfield" className="col-span-3" disabled={isLoading} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="state" className="text-right">State</Label>
            <Input id="state" name="state" value={newDonor.state} onChange={handleChange} placeholder="IL" className="col-span-3" disabled={isLoading} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="zipCode" className="text-right">ZIP Code</Label>
            <Input id="zipCode" name="zipCode" value={newDonor.zipCode} onChange={handleChange} placeholder="12345" className="col-span-3" disabled={isLoading} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">Notes</Label>
            <textarea
              id="notes"
              name="notes"
              value={newDonor.notes}
              onChange={handleChange}
              placeholder="Add any notes about this donor"
              className={`col-span-3 w-full rounded-md border p-2 ${errors.notes ? "border-red-500" : "border-input"}`}
              rows={3}
              disabled={isLoading}
            />
            {errors.notes && <p className="col-span-4 text-xs text-red-500 text-right">{errors.notes}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Donor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

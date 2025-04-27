"use client"

import type React from "react"

import { useState, useCallback } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"
import { useTranslation } from 'react-i18next'

interface AddMemberModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AddMemberModal({ open, onClose, onSuccess }: AddMemberModalProps) {
  const { t } = useTranslation(['members', 'common'])
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    address: "",
    city: "",
    state: "",
    zipCode: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    membershipStatus: "new" as "active" | "visitor" | "inactive" | "new",
    language: "spanish" as "english" | "spanish" | "both",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const dataToSend = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      membershipStatus: formData.membershipStatus,
      language: formData.language,
      joinDate: new Date().toISOString(),
      email: formData.email || null,
      phone: formData.phone || null,
      address: formData.address || null,
      city: formData.city || null,
      state: formData.state || null,
      zipCode: formData.zipCode || null,
    };

    try {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        let errorMessage = "Failed to add member.";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || (errorData.details ? JSON.stringify(errorData.details) : errorMessage);
        } catch (jsonError) {
          errorMessage = `HTTP error! status: ${response.status}`; 
        }
        throw new Error(errorMessage);
      }

      toast({
        title: "Member Added",
        description: `${formData.firstName} ${formData.lastName} has been added successfully.`,
        variant: "default", 
      });
      
      if (onSuccess) {
        onSuccess();
      }
      resetForm();

    } catch (error: any) {
      console.error("Error adding member:", error);
      setError(error.message || "An unexpected error occurred.");
      toast({
        title: "Error Adding Member",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));

    if (id === 'phone') {
      if (value && !/^\d{10}$/.test(value)) {
        setPhoneError("common:errors.invalidPhoneDigits");
      } else {
        setPhoneError(null);
      }
    }

    if (id === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) {
        setEmailError("common:errors.invalidEmailFormat");
      } else {
        setEmailError(null);
      }
    }
  };

  const resetForm = () => {
      setFormData({ 
          address: "", city: "", state: "", zipCode: "", 
          firstName: "", lastName: "", email: "", phone: "",
          membershipStatus: "new", language: "spanish",
      });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          resetForm();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle className="mb-2">{t('members:newMember')}</DialogTitle>
          <DialogDescription>
            {t('members:modal.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto pr-1">
          {error && (
            <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              <p>{error}</p>
            </div>
          )}
          <form id="add-member-form" onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">{t('members:modal.basicInfo', 'Basic Information')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t('members:firstName', 'First Name')} *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder={t('common:placeholders.enterFirstName')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t('members:lastName', 'Last Name')} *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder={t('common:placeholders.enterLastName')}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">{t('members:contactInformation', 'Contact Information')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('members:phone', 'Phone Number')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder={t('common:placeholders.phoneExample')}
                    maxLength={10}
                    aria-describedby="phone-error"
                  />
                  {phoneError && (
                    <p id="phone-error" className="text-sm text-destructive">
                      {t(phoneError)}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('members:email', 'Email Address')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={t('common:placeholders.emailExample')}
                    aria-describedby="email-error"
                  />
                  {emailError && (
                    <p id="email-error" className="text-sm text-destructive">
                      {t(emailError)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">{t('members:address', 'Address')}</h3>
              <div className="space-y-2">
                <Label htmlFor="address">{t('common:streetAddress', 'Street Address')}</Label>
                <Input 
                  id="address" 
                  value={formData.address} 
                  onChange={handleChange} 
                  placeholder={t('common:placeholders.streetExample')} 
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">{t('members:city')}</Label>
                  <Input id="city" value={formData.city} onChange={handleChange} placeholder={t('common:placeholders.city')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">{t('members:state')}</Label>
                  <Input id="state" value={formData.state} onChange={handleChange} placeholder={t('common:placeholders.state')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">{t('members:zipCode')}</Label>
                  <Input id="zipCode" value={formData.zipCode} onChange={handleChange} placeholder={t('common:placeholders.zipExample')} />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">{t('members:membershipInformation', 'Member Details')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="membershipStatus">{t('members:status', 'Membership Status')}</Label>
                  <select
                    id="membershipStatus"
                    value={formData.membershipStatus}
                    onChange={handleChange}
                    required
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="new">{t('members:statuses.new')}</option>
                    <option value="active">{t('members:statuses.active')}</option>
                    <option value="visitor">{t('members:statuses.visitor')}</option>
                    <option value="inactive">{t('members:statuses.inactive')}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">{t('members:preferredLanguage', 'Preferred Language')}</Label>
                  <select
                    id="language"
                    value={formData.language}
                    onChange={handleChange}
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
          </form>
        </div>

        <DialogFooter className="mt-2 pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common:cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !!phoneError || !!emailError}
            onClick={() => (document.getElementById("add-member-form") as HTMLFormElement | null)?.requestSubmit()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common:adding', 'Adding...')}
              </>
            ) : (
              t('members:newMember', 'Add Member')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

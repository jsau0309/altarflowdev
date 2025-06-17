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
import { toast } from "sonner";
import { updateDonorDetails, UpdateDonorPayload } from "@/lib/actions/donors.actions"; 
import { getAllMembersForLinking, MemberForLinkingSummary } from '@/lib/actions/members.actions'; 
import { ScrollArea } from "@/components/ui/scroll-area";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

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
  onSuccess: (updatedDonor: DonorDetailsData) => void;
  donor: DonorDetailsData | null;
  onDonorUpdate?: (updatedDonor: DonorDetailsData) => void; 
  currentChurchId: string | null; // Can be null if donor not linked or context unknown
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
  memberId: string | null; 
}

export function EditDonorModal({ isOpen, onClose, donor, onDonorUpdate, onSuccess, currentChurchId }: EditDonorModalProps) {
  // const router = useRouter() // Unused
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState<MemberForLinkingSummary[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
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
    memberId: null,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { t } = useTranslation(['donations', 'members']); 

  useEffect(() => {
    if (isOpen && donor) {
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
        memberId: donor.memberId || null,
      };
      setFormData(formDataFromDonor);
      setSelectedMemberId(donor.memberId);
      setErrors({}); 

      const fetchMembers = async () => {
        setLoadingMembers(true);
        getAllMembersForLinking()
          .then(data => {
            setMembers(data);
          })
          .catch(error => {
            console.error('Failed to fetch all members:', error);
            toast.error(t('fetchMembersFailed'));
            setMembers([]); // Clear members on error
          })
          .finally(() => {
            setLoadingMembers(false);
          });
      };

      fetchMembers();

    } else if (!isOpen) {
      // Reset state when modal is closed to ensure fresh state on reopen
      setMembers([]);
      setSelectedMemberId(null);
      setLoadingMembers(false);
      // Reset form data to initial to avoid stale data if donor prop changes
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        memberId: null,
        address: "",
        city: "",
        state: "",
        zipCode: "",
        notes: "",
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

  const handlePhoneChange = (value: string | undefined) => {
    setFormData((prev) => ({ ...prev, phone: value || '' }));
    if (errors.phone) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.phone;
        return newErrors;
      });
    }
  };

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
      const payloadForUpdate: UpdateDonorPayload = {
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        email: formData.email || null, // email can be null
        phone: formData.phone || null, // phone can be null
        address: formData.address || null, // maps to addressLine1
        city: formData.city || null,
        state: formData.state || null,
        zipCode: formData.zipCode || null, // maps to postalCode
        // country is not in FormData, so it won't be sent unless added
        memberId: selectedMemberId, // Use the state variable for selected member ID
      };

      // Remove undefined fields to avoid sending them, unless they are explicitly set to null (like email/phone)
      Object.keys(payloadForUpdate).forEach(key => 
        (payloadForUpdate as any)[key] === undefined && delete (payloadForUpdate as any)[key]
      );

      console.log('[EditDonorModal] Submitting payload to action:', payloadForUpdate);
      const result = await updateDonorDetails(donor.id, payloadForUpdate);

      if (result) { // result is DonorDetailsData if successful, null otherwise
        console.log("Donor updated successfully:", result);
        toast.success(t('editDonorModal.updateSuccess', { ns: 'donations' }));
        if (onDonorUpdate) {
          onDonorUpdate(result); // result is the full DonorDetailsData
        }
        onSuccess(result); // Call onSuccess prop
        onClose(); // Close modal on success
      } else {
        console.error("Failed to update donor. The action returned null.");
        toast.error(t('editDonorModal.errors.updateFailed', { ns: 'donations' }));
        setErrors(prev => ({ ...prev, form: t('donations:editDonorModal.errors.updateFailed') }));
      }  
    } catch (error) {
      console.error("Failed to update donor:", error);
      toast.error(t('editDonorModal.errors.updateFailed', { ns: 'donations' }));
      setErrors({ form: t('editDonorModal.errors.updateFailed', { ns: 'donations' }) });
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
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <ScrollArea className="flex-grow h-[calc(100vh-280px)] md:h-[50vh] lg:h-[60vh] pr-6 py-4">
            <div className="space-y-4">
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
            <PhoneInput
              id="phone"
              international
              defaultCountry="US"
              value={formData.phone}
              onChange={handlePhoneChange}
              placeholder={t('donations:editDonorModal.phonePlaceholder')}
              className={`input flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.phone ? "border-red-500" : ""}`}
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

          {/* Link to Member Section */}
          <div className="space-y-2">
            <Label htmlFor="memberId">{t('linkToMember', { ns: 'donations' })}</Label>
            {donor?.linkedMemberName && (
              <p className="text-sm text-muted-foreground">
                {t('currentlyLinkedTo', { ns: 'donations' })}: {donor.linkedMemberName}
              </p>
            )}
            <Select
              value={selectedMemberId || ''}
              onValueChange={setSelectedMemberId}
              disabled={loadingMembers}
            >
              <SelectTrigger id="memberId" className="w-full">
                <SelectValue placeholder={t('selectMemberToLink', { ns: 'donations' })} />
              </SelectTrigger>
              <SelectContent>
                {loadingMembers ? (
                  <SelectItem value="__loading__" disabled>
                    {t('loadingMembers', { ns: 'donations' })}...
                  </SelectItem>
                ) : (
                  <>
                    <SelectItem value="__none__">
                      {t('noMemberOrUnlink', { ns: 'donations' })}
                    </SelectItem>
                    {members.map((member: MemberForLinkingSummary) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.firstName} {member.lastName} ({member.email ?? t('noEmail', { ns: 'common' })})
                      </SelectItem>
                    ))}
                    {(!members || members.length === 0) && !loadingMembers && (
                       <SelectItem value="__no_members_found__" disabled>
                         {t('noMembersFound', { ns: 'donations' })}
                       </SelectItem>
                    )}
                  </>
                )}
              </SelectContent>
            </Select>
            {/* TODO: Add error display for memberId if needed */}
          </div>
        </div>
      </ScrollArea>
        <DialogFooter className="mt-auto pt-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              {t('donations:editDonorModal.cancelButton')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('editDonorModal.saving', { ns: 'donations' })}
                </>
              ) : (
                t('editDonorModal.saveButton', { ns: 'donations' })
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

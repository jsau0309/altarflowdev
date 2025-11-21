"use client"


import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Edit, Phone, Mail, Trash2, Loader2, MailX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import type { Member } from "@/lib/types"
import { EditMemberForm, type FormData as EditFormData } from "./edit-member-form"
import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from 'sonner'

interface MemberDetailsDrawerProps {
  member: Member
  open: boolean
  onClose: () => void
  onActionComplete: () => void
}

// Helper function like in NewExpenseModal (adjust if needed)
const formatDateForInput = (dateInput: Date | string | undefined | null): string => {
  if (!dateInput) return ''; // Return empty string for input if null/undefined
  try {
    const dateObj = new Date(dateInput);
    if (isNaN(dateObj.getTime())) throw new Error("Invalid date");
    return dateObj.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  } catch (error) {
    console.error('Error formatting date for input:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
    return ''; // Fallback to empty string
  }
};

export function MemberDetailsDrawer({ member, open, onClose, onActionComplete }: MemberDetailsDrawerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { t } = useTranslation(['members', 'common']);
  // const { toast } = useToast(); // Sonner's toast is used directly

  // State lifted from EditMemberForm
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [formData, setFormData] = useState<EditFormData>({
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
    joinDate: '', // Initialize as empty string
  })

  // Initialize form data when member changes or editing starts
  useEffect(() => {
    if (member && isEditing) {
      let mappedStatus: string | null = member.membershipStatus || null;
      const lowerCaseStatus = typeof mappedStatus === 'string' ? mappedStatus.toLowerCase() : null;

      if (lowerCaseStatus === "statuses.new" || lowerCaseStatus === "new") {
        mappedStatus = "Visitor";
      } else if (lowerCaseStatus === "statuses.active" || lowerCaseStatus === "active") {
        mappedStatus = "Member";
      } else if (mappedStatus !== null && !["Visitor", "Member", "Inactive"].includes(mappedStatus)) {
        // If it's some other unexpected non-null value, default to null (shows placeholder)
        console.warn('[MemberDetailsDrawer] Unknown membershipStatus "${member.membershipStatus}" received for member ${member.id}. Defaulting to null.', { operation: 'ui.warn' });
        mappedStatus = null;
      }

      setFormData({
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        email: member.email || "",
        phone: member.phone || "",
        address: member.address || "",
        city: member.city || "",
        state: member.state || "",
        zipCode: member.zipCode || "",
        membershipStatus: mappedStatus, // Use the mapped status
        language: member.preferredLanguage || "spanish",
        joinDate: formatDateForInput(member.joinDate), // Use helper
      });
      // Reset errors when opening edit mode
      setPhoneError(null);
      setEmailError(null);
    }
  }, [member, isEditing]);

  // Handlers lifted from EditMemberForm
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    // Debug logging removed: handling form field change
    const { name, value } = e.target; // Use name attribute now
    setFormData((prev: EditFormData) => ({ ...prev, [name]: value }));

    if (name === 'phone') {
      if (value && !/^\d{10}$/.test(value)) {
        setPhoneError("common:errors.invalidPhoneDigits");
      } else {
        setPhoneError(null);
      }
    }

    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) {
        setEmailError("common:errors.invalidEmailFormat");
      } else {
        setEmailError(null);
      }
    }
  };

  const handleCancelClick = () => {
    setIsEditing(false); // Just switch back the view
    // Reset errors and potentially formData if needed, 
    // but useEffect will reset formData when isEditing becomes true again
    setPhoneError(null);
    setEmailError(null);
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    // Debug logging removed: form submission triggered
    e?.preventDefault(); // Prevent default if called from form submit event
    if (phoneError || emailError) return;
    
    setIsSubmitting(true);

    // Ensure date is treated as UTC start of day or null
    let finalJoinDate: string | null = null;
    if (formData.joinDate) { // Check if date string is not empty
        try {
            // Parse YYYY-MM-DD and format as full ISO string (assumes UTC start of day)
            finalJoinDate = new Date(`${formData.joinDate}T00:00:00Z`).toISOString();
        } catch {
                  console.error('Member joinDate is not a Date object', { operation: 'ui.member.joindate_error', joinDate: member.joinDate, type: typeof member.joinDate });
            // Handle error - maybe show a toast? For now, set to null.
            finalJoinDate = null;
        }
    }

    // *** ADD THIS LOG ***
  // Debug logging removed: join date formatting for submission

  const dataToUpdate = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email || null,
      phone: formData.phone || null,
      address: formData.address || null,
      city: formData.city || null,
      state: formData.state || null,
      zipCode: formData.zipCode || null,
      membershipStatus: formData.membershipStatus,
      language: formData.language,
      joinDate: finalJoinDate, // Send ISO string or null
    };

    try {
      const response = await fetch(`/api/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToUpdate),
      });

      if (!response.ok) {
        let errorMsg = t('common:updateMemberError.description');
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || (errorData.details ? JSON.stringify(errorData.details) : errorMsg);
        } catch { /* Ignore */ }
        throw new Error(errorMsg);
      }

      toast.success(t('members:edit.successTitle', 'Member Updated'), {
        description: t('members:edit.successMessage', 'Member details have been successfully updated.')
      });
      handleSaveSuccess(); // Call the original success handler

    } catch (error: any) {
      console.error('Error updating member:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
      const isUniqueConstraintError = error.message?.includes('constraint violation') || error.message?.includes('already exist');
      let toastTitle = t('members:edit.errorTitle', 'Error Updating Member');
      let toastDescription = error.message || t('members:edit.errorMessage', 'Failed to update member details. Please try again.');

      if (isUniqueConstraintError && error.message?.toLowerCase().includes('email')) {
        toastTitle = t('members:edit.emailConflictTitle', 'Email Exists');
        toastDescription = t('members:edit.emailConflictMessage', 'This email address is already associated with another member.');
      } else if (isUniqueConstraintError) {
        toastTitle = t('members:edit.constraintViolationTitle', 'Save Error');
        toastDescription = t('members:edit.constraintViolationMessage', 'A value provided conflicts with an existing record. Please check the details and try again.');
      }

      toast.error(toastTitle, {
        description: toastDescription
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Original success handler (no change needed here)
  const handleSaveSuccess = () => {
    setIsEditing(false); 
    onActionComplete();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/members/${member.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorMsg = t('common:errors.deleteFailed', 'Failed to delete member.');
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch { /* Ignore JSON parse error */ }
        throw new Error(errorMsg);
      }

      toast.success(t('members:delete.successTitle', 'Member Deleted'), {
        description: t('members:delete.successMessage', 'The member has been successfully deleted.')
      });
      setConfirmDeleteOpen(false);
      onClose();
      onActionComplete();

    } catch (error: any) {
      console.error('Error deleting member:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
      toast.error(t('members:delete.errorTitle', 'Error Deleting Member'), {
        description: error.message || t('members:delete.errorMessage', 'Failed to delete member. Please try again.')
      });
      setConfirmDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }

  // Helper to get language display text (if not already defined)
  const getLanguageText = (lang: string | null | undefined) => {
    if (!lang) return t('common:unknown');
    if (lang === 'both') return t('common:languages.bilingual', 'Bilingual');
    if (lang === 'spanish') return t('common:languages.spanish', 'Spanish');
    if (lang === 'english') return t('common:languages.english', 'English');
    return t('common:unknown');
  }

  // Helper to get membership status text
  const getStatusText = (status: string | null | undefined) => {
    if (!status) return t('common:unknown');
    return t(`members:statuses.${status}`, status);
  }

  if (!member) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { 
      if (!isOpen) {
        setIsEditing(false); // Reset edit mode when drawer closes
        onClose(); 
      }
    }}>
      <SheetContent className="sm:max-w-md w-[90vw] p-0 flex flex-col outline-none">
        <SheetHeader className="p-6 border-b shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle>
               {isEditing 
                 ? t('members:drawerEditTitle', 'Edit Member') 
                 : t('members:profile', 'Member Profile')}
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="overflow-y-auto flex-grow">
          {isEditing ? (
            <form id="edit-member-form">
              <EditMemberForm
                formData={formData}
                onFormChange={handleChange}
                phoneError={phoneError}
                emailError={emailError}
                t={(key: string, options?: string) => t(key, options || '')}
              />
            </form>
          ) : (
            <div className="p-4 space-y-6">
              <h2 className="text-2xl font-bold mb-1 ">{member.firstName} {member.lastName}</h2>
              <p className="text-sm text-muted-foreground">
                {t('members:memberSince', 'Member since {{date}}', { 
                  date: (() => { 
                    console.log('[Drawer] member.joinDate', {
                      operation: 'ui.member.join_date_debug',
                      joinDate: member.joinDate,
                      joinDateType: typeof member.joinDate
                    });
                    const joinDate = member.joinDate as any; // Type assertion 
                    // Check if it looks like a Date object and is valid
                    if (joinDate && typeof joinDate.getTime === 'function' && !isNaN(joinDate.getTime())) {
                      // The 'joinDate' variable here is already confirmed to be a valid Date object
                      // representing a UTC timestamp (e.g., 2025-05-14T00:00:00.000Z).
                      // We want to display the calendar date as it is in UTC, regardless of local timezone.
                      const year = joinDate.getUTCFullYear();
                      const month = joinDate.getUTCMonth(); // 0-indexed
                      const day = joinDate.getUTCDate();
                      // Construct a new Date object using these UTC components.
                      // new Date(year, month, day) creates a date at 00:00:00 in the *local* timezone.
                      // This is what we want for display, so "May 14" is shown for "May 14 UTC".
                      const localDateToDisplay = new Date(year, month, day);
                      return format(localDateToDisplay, "PP");
                    } else {
                      return t('common:unknown'); // Fallback if not a valid date
                    }
                  })() 
                })}
              </p>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('members:status', 'Status')}</p>
                  <Badge
                    variant={
                      member.membershipStatus === "Member" // MODIFIED: Was "active"
                        ? "default"
                        : member.membershipStatus === "Visitor" // MODIFIED: Was "new"
                          ? "secondary"
                          : "outline"
                    }
                    className={` ${
                      member.membershipStatus === "Member" // MODIFIED: Was "active"
                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                        : member.membershipStatus === "Visitor" // MODIFIED: Was "new"
                          ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                          : ""
                    }`}
                  >
                    {getStatusText(member.membershipStatus)}
                  </Badge>
                </div>
                <div>
                   <p className="text-sm text-muted-foreground">{t('members:preferredLanguage', 'Preferred Language')}</p>
                   <p className="font-medium capitalize">
                      {getLanguageText(member.preferredLanguage)}
                   </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">{t('members:contactInformation', 'Contact Information')}</h3>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{member.phone || t('common:noPhoneNumber', "No phone number")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className={member.email && member.emailPreference?.isSubscribed === false ? "line-through text-muted-foreground" : ""}>
                    {member.email || t('common:noEmailAddress', "No email address")}
                  </span>
                  {member.email && member.emailPreference?.isSubscribed === false && (
                    <Badge variant="destructive" className="text-xs px-1.5 py-0">
                      <MailX className="h-3 w-3 mr-1" />
                      {t('members:unsubscribed', 'Unsubscribed')}
                    </Badge>
                  )}
                </div>
              </div>

              { (member.address || member.city || member.state || member.zipCode) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">{t('common:address', 'Address')}</h3>
                  <p className="text-sm font-medium">
                    {member.address || '-'}<br />
                    {member.city && `${member.city}, `}{member.state && `${member.state} `}{member.zipCode}
                  </p>
                </div>
              )}

              <Separator />

              <div className="bg-muted/30 p-4 rounded-md">
                <p className="text-sm text-muted-foreground mb-2">{t('common:auditInfo', 'Audit Information')}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('common:createdOn', 'Created on')}</p>
                    <p>{member.createdAt ? format(new Date(member.createdAt), "PPpp") : '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('common:lastModified', 'Last modified')}</p>
                    <p>{member.updatedAt ? format(new Date(member.updatedAt), "PPpp") : '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('common:id', 'ID')}</p>
                    <p className="font-mono text-xs">{member.id}</p>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer: Show Save/Cancel in Edit mode, Edit/Delete in View mode */}
        {isEditing ? (
            <SheetFooter className="p-6 border-t shrink-0">
              <div className="flex justify-between w-full">
                <Button type="button" variant="outline" onClick={handleCancelClick} disabled={isSubmitting}>
                    {t('common:cancel')}
                </Button>
                <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !!phoneError || !!emailError}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('common:saving', 'Saving...')}
                        </>
                    ) : (
                        t('common:saveChanges', 'Save Changes')
                    )}
                </Button>
              </div>
            </SheetFooter>
        ) : (
            <SheetFooter className="p-6 border-t shrink-0">
              <div className="flex justify-between gap-2 w-full">
                <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive">
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t('common:delete')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('common:deleteMemberConfirmation.title')}</DialogTitle>
                      <DialogDescription>
                        {t('common:deleteMemberConfirmation.description')}
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                      <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)} disabled={isDeleting}>
                        {t('common:cancel')}
                      </Button>
                      <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                        {t('common:delete')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  {t('common:edit')}
                </Button>
              </div>
            </SheetFooter>
        )}

      </SheetContent>
    </Sheet>
  )
}
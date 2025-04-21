"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Edit, Phone, Mail, MapPin, Check, X, MoreVertical, Trash } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import type { Member } from "@/lib/types"
import { EditMemberForm } from "./edit-member-form"
import { useTranslation } from "react-i18next"

interface MemberDetailsDrawerProps {
  member: Member
  open: boolean
  onClose: () => void
}

export function MemberDetailsDrawer({ member, open, onClose }: MemberDetailsDrawerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const { t } = useTranslation(['members', 'common'])

  const handleSave = () => {
    // In a real app, this would update the member data
    setIsEditing(false)
    // Force a refresh of the drawer
    onClose()
  }

  // Helper to get language display text
  const getLanguageText = (lang: string | undefined) => {
    if (!lang) return '';
    if (lang === 'both') return t('common:languageOptions.both', 'Bilingual');
    if (lang === 'spanish') return t('common:languageOptions.spanish', 'Spanish');
    return t('common:languageOptions.english', 'English');
  }

  // Helper to get membership status text
  const getStatusText = (status: string | undefined) => {
    if (!status) return '';
    return t(`members:statuses.${status}`, status);
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md w-[90vw] p-0 flex flex-col">
        <SheetHeader className="p-6 border-b">
          <div className="flex justify-between items-center">
            <SheetTitle>{t('members:profile')}</SheetTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t('common:moreActions', 'More actions')}>
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  {t('common:edit')} {t('members:member', 'Member')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash className="h-4 w-4 mr-2" />
                  {t('common:delete')} {t('members:member', 'Member')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SheetHeader>

        {isEditing ? (
          <div className="flex-1 overflow-auto p-6">
            <EditMemberForm
              member={member}
              onCancel={() => setIsEditing(false)}
              onSave={handleSave}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="p-6">
              {/* Member header with name and actions */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">
                    {member.firstName} {member.lastName}
                  </h2>
                  <p className="text-muted-foreground">
                    {t('common:memberSince', 'Member since')} {format(new Date(member.joinDate), "PP")}
                  </p>
                </div>
              </div>

              {/* Status badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                <Badge
                  variant={
                    member.membershipStatus === "active"
                      ? "default"
                      : member.membershipStatus === "new"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {getStatusText(member.membershipStatus)}
                </Badge>

                {member.language && (
                  <Badge
                    variant={
                      member.language === "spanish"
                        ? "default"
                        : member.language === "english"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {getLanguageText(member.language)}
                  </Badge>
                )}
              </div>

              {/* Contact information */}
              <div className="space-y-4 mb-6">
                <h3 className="text-sm font-medium text-muted-foreground">{t('members:contactInformation')}</h3>

                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{member.phone || t('common:noPhoneNumber', 'No phone number')}</span>
                    {member.phoneVerified && (
                      <Badge variant="outline" className="ml-auto text-xs">
                        {t('common:verified', 'Verified')}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{member.email || t('common:noEmailAddress', 'No email address')}</span>
                  </div>

                  {member.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <div>{member.address}</div>
                        {member.city && member.state && (
                          <div>
                            {member.city}, {member.state} {member.zipCode}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator className="my-6" />

              {/* SMS Consent Status - Simplified */}
              <div className="rounded-md border p-4">
                <div className="flex items-center gap-3">
                  {member.smsConsent ? (
                    <>
                      <div className="rounded-full bg-green-100 p-2">
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{t('members:smsConsentStatus', 'SMS Consent: Yes')}</h4>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-full bg-red-100 p-2">
                        <X className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{t('members:smsConsentStatusNo', 'SMS Consent: No')}</h4>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

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
import type { ExtendedMember } from "@/lib/mock-data-extensions"
import { EditMemberForm } from "./edit-member-form"

interface MemberDetailsDrawerProps {
  member: ExtendedMember
  open: boolean
  onClose: () => void
  onSendSms?: () => void
}

export function MemberDetailsDrawer({ member, open, onClose, onSendSms }: MemberDetailsDrawerProps) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md w-[90vw] p-0 flex flex-col">
        <SheetHeader className="p-6 border-b">
          <div className="flex justify-between items-center">
            <SheetTitle>Member Details</SheetTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More actions">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Member
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash className="h-4 w-4 mr-2" />
                  Delete Member
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
              onSave={(updatedMember) => {
                // In a real app, this would update the member data
                setIsEditing(false)
                // Force a refresh of the drawer
                onClose()
              }}
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
                    Member since {format(new Date(member.joinDate), "MMMM d, yyyy")}
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
                  {member.membershipStatus}
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
                    {member.language === "both" ? "Bilingual" : member.language === "spanish" ? "Spanish" : "English"}
                  </Badge>
                )}
              </div>

              {/* Contact information */}
              <div className="space-y-4 mb-6">
                <h3 className="text-sm font-medium text-muted-foreground">Contact Information</h3>

                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{member.phone || "No phone number"}</span>
                    {member.phoneVerified && (
                      <Badge variant="outline" className="ml-auto text-xs">
                        Verified
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{member.email || "No email address"}</span>
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
                        <h4 className="font-medium">SMS Consent: Yes</h4>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-full bg-red-100 p-2">
                        <X className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">SMS Consent: No</h4>
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

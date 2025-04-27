"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button, type ButtonProps } from "@/components/ui/button"
import { AddMemberModal } from "@/components/members/add-member-modal"
import { useTranslation } from "react-i18next"

interface AddMemberButtonProps extends ButtonProps {
  onMemberAdded?: () => void
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  showIcon?: boolean
  label?: string
}

export function AddMemberButton({
  onMemberAdded,
  variant = "default",
  size = "default",
  showIcon = true,
  label,
  className,
  ...props
}: AddMemberButtonProps) {
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const { t } = useTranslation('members')

  const buttonLabel = label ?? t('members:newMember')

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowAddMemberModal(true)}
        className={className}
        {...props}
      >
        {showIcon && <Plus className="h-4 w-4 mr-2" />}
        {buttonLabel}
      </Button>

      <AddMemberModal
        open={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        onSuccess={() => {
          if (onMemberAdded) {
            onMemberAdded()
          }
          setShowAddMemberModal(false)
        }}
      />
    </>
  )
}

"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button, type ButtonProps } from "@/components/ui/button"
import { AddMemberModal } from "./add-member-modal"

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
  label = "Add Member",
  className,
  ...props
}: AddMemberButtonProps) {
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)

  const handleAddMemberSuccess = () => {
    if (onMemberAdded) {
      onMemberAdded()
    }
  }

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
        {label}
      </Button>

      <AddMemberModal
        open={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        onSuccess={handleAddMemberSuccess}
      />
    </>
  )
}

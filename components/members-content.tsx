"use client"
import { Users } from "lucide-react"
import { EnhancedMemberDirectory } from "@/components/members/enhanced-member-directory"
import { AddMemberButton } from "@/components/members/add-member-button"

export function MembersContent() {
  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Member Management</h1>
        <p className="text-muted-foreground">Manage church members and track their information</p>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Member Directory
            </h3>
            <p className="text-sm text-muted-foreground mt-1">View, add, and manage your church members</p>
          </div>
          <AddMemberButton onMemberAdded={() => {}} />
        </div>

        <div className="p-4">
          <EnhancedMemberDirectory showAddButton={false} />
        </div>
      </div>
    </div>
  )
}

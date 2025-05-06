"use client"
import { Users } from "lucide-react"
import { EnhancedMemberDirectory } from "@/components/members/enhanced-member-directory"
import { AddMemberButton } from "@/components/members/add-member-button"
import { useTranslation } from 'react-i18next'
import { useState, useEffect } from "react"
import { type Member } from "@/lib/types"

export function MembersContent() {
  const { t } = useTranslation(['members', 'common'])

  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const fetchMembers = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/members', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const processedData = data.map((member: any) => ({
        ...member,
        joinDate: member.joinDate ? new Date(member.joinDate) : null,
      }));
      setMembers(processedData);
    } catch (e) {
      console.error("Failed to fetch members:", e);
      setError(t('common:errors.fetchFailed', 'Failed to load members. Please try again.'));
    } finally {
      setIsLoading(false)
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [])

  const handleAddMemberSuccess = () => {
    fetchMembers();
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('members:title', 'Member Management')}</h1>
          <p className="text-muted-foreground">{t('members:membersContent.subtitle', 'Manage church members and track their information')}</p>
        </div>
        <AddMemberButton onMemberAdded={handleAddMemberSuccess} />
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('members:memberDirectory', 'Member Directory')}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{t('members:membersContent.directorySubtitle', 'View, add, and manage your church members')}</p>
          </div>
          <AddMemberButton onMemberAdded={handleAddMemberSuccess} />
        </div>

        <div className="p-4">
          <EnhancedMemberDirectory 
            members={members} 
            isLoading={isLoading} 
            error={error} 
            filterStatus={filterStatus}
            onFilterChange={setFilterStatus}
            onActionComplete={fetchMembers} 
          />
        </div>
      </div>
    </div>
  )
}

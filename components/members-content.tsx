"use client"
import { logger } from '@/lib/logger';
import { Users, Filter } from "lucide-react"
import { EnhancedMemberDirectory } from "@/components/members/enhanced-member-directory"
import { AddMemberButton } from "@/components/members/add-member-button"
import { useTranslation } from 'react-i18next'
import { useState, useEffect, useCallback } from "react"
import { type Member } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function MembersContent() {
  const { t } = useTranslation(['members', 'common'])

  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
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
      logger.error('Failed to fetch members:', { operation: 'ui.error' }, e instanceof Error ? e : new Error(String(e)));
      setError(t('common:errors.fetchFailed', 'Failed to load members. Please try again.'));
    } finally {
      setIsLoading(false)
    }
  }, [t]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers])

  const handleAddMemberSuccess = () => {
    fetchMembers();
  }

  // Helper to get status text for badges and dropdown
  const getStatusText = (status: string | undefined | null) => {
    if (!status) return t('common:unknown');
    // Convert to lowercase for translation key
    const statusKey = status.toLowerCase();
    return t(`members:statuses.${statusKey}`, status.charAt(0).toUpperCase() + status.slice(1));
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('members:title', 'Member Management')}</h1>
          <p className="text-muted-foreground">{t('members:membersContent.subtitle', 'Manage church members and track their information')}</p>
        </div>
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
          
          <div className="flex gap-2">
            {/* Filter dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  {t('common:filter', 'Filter')}
                  {filterStatus && <span className="ml-2 text-xs text-muted-foreground">({getStatusText(filterStatus)})</span>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('members:filterByStatus', 'Filter by Status')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* Option to clear filter */}
                <DropdownMenuCheckboxItem
                  checked={!filterStatus}
                  onSelect={() => setFilterStatus(null)}
                >
                  {t('common:allStatuses', 'All Statuses')}
                </DropdownMenuCheckboxItem>
                {/* Options for each status */}
                {["Member", "Visitor", "Inactive"].map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={filterStatus === status}
                    onSelect={() => setFilterStatus(status)}
                  >
                    {getStatusText(status)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <AddMemberButton onMemberAdded={handleAddMemberSuccess} />
          </div>
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

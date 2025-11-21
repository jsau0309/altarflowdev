"use client"
import { logger } from '@/lib/logger';

import { useState, useEffect, useMemo } from "react"
import { Search, Phone, Mail, MailX } from "lucide-react"
import LoaderOne from "@/components/ui/loader-one";
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { type Member } from "@/lib/types"
import { MemberDetailsDrawer } from "./member-details-drawer"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "react-i18next"

// Add props for filter state and handler
interface EnhancedMemberDirectoryProps {
  members: Member[];
  isLoading: boolean;
  error: string | null;
  filterStatus: string | null;
  onFilterChange: (status: string | null) => void;
  onActionComplete: () => void;
}

// Destructure new props
export function EnhancedMemberDirectory({
  members,
  isLoading,
  error,
  filterStatus,
  onFilterChange,
  onActionComplete
}: EnhancedMemberDirectoryProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [showMemberDetails, setShowMemberDetails] = useState(false)
  const { t } = useTranslation(['members', 'common'])

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Effect to update selectedMember state when the main members list prop changes
  useEffect(() => {
    if (selectedMember && showMemberDetails) {
      // Find the corresponding member in the potentially updated list
      const updatedMember = members.find(m => m.id === selectedMember.id);
      // Update the state only if the data has actually changed
      // (Simple stringify comparison, might need deep comparison for complex objects)
      if (updatedMember && JSON.stringify(updatedMember) !== JSON.stringify(selectedMember)) {
        setSelectedMember(updatedMember);
      } else if (!updatedMember) {
        // Member was likely deleted (e.g., by the action), close the drawer
        setShowMemberDetails(false);
        setSelectedMember(null);
      }
    }
    // Ensure selectedMember is updated even if the drawer is closed and reopened later
    // This handles cases where the list updates while the drawer isn't visible
    else if (selectedMember && !showMemberDetails) {
      const updatedMember = members.find(m => m.id === selectedMember.id);
      if (updatedMember && JSON.stringify(updatedMember) !== JSON.stringify(selectedMember)) {
        setSelectedMember(updatedMember);
      } else if (!updatedMember) {
         setSelectedMember(null); // Clear selection if deleted
      }
    }
  }, [members, selectedMember, showMemberDetails]); // Rerun when members list or selection changes

  // Filter members based on search term AND status
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const searchMatch = (
        !searchTerm ||
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (member.phone && member.phone.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      const statusMatch = (
        !filterStatus || // Show all if no filter selected
        member.membershipStatus === filterStatus
      );

      return searchMatch && statusMatch;
    });
  }, [searchTerm, filterStatus, members])

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / itemsPerPage))

  // Reset to page 1 when search term OR filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus]) // Add filterStatus dependency

  // Ensure current page is valid
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const goToPage = (page: number) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(pageNumber)
  }

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  // Get paginated members
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage - 1, filteredMembers.length - 1)
  const paginatedMembers = filteredMembers.slice(startIndex, endIndex + 1)

  const handleMemberClick = (member: Member) => {
    setSelectedMember(member)
    setShowMemberDetails(true)
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow) {
      // Show all pages if there are few
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      // Calculate start and end of page range around current page
      let startPage = Math.max(2, currentPage - 1)
      let endPage = Math.min(totalPages - 1, currentPage + 1)

      // Adjust if we're near the start
      if (currentPage <= 3) {
        endPage = Math.min(totalPages - 1, 4)
      }

      // Adjust if we're near the end
      if (currentPage >= totalPages - 2) {
        startPage = Math.max(2, totalPages - 3)
      }

      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pages.push(-1) // -1 represents ellipsis
      }

      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }

      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pages.push(-2) // -2 represents ellipsis
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  // Helper to get status text for badges and dropdown
  const getStatusText = (status: string | undefined | null) => {
    if (!status) return t('common:unknown');
    // Convert to lowercase for translation key
    const statusKey = status.toLowerCase();
    return t(`members:statuses.${statusKey}`, status.charAt(0).toUpperCase() + status.slice(1));
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t('common:searchPlaceholderMembers', 'Search members...')}
          className="w-full rounded-md pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Use isLoading prop */}
      {isLoading ? (
        <div className="flex justify-center items-center h-[500px]">
          <LoaderOne />
        </div>
      ) : error ? ( // Use error prop
        <div className="flex min-h-[300px] items-center justify-center rounded-md border border-dashed border-destructive p-4 sm:p-8 text-center">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <h3 className="mt-4 text-lg font-semibold text-destructive">{t('common:errors.errorTitle', 'Error')}</h3>
            <p className="mb-4 mt-2 text-sm text-destructive">
              {error}
            </p>
            {/* Remove retry button or pass refetch function as prop if needed later */}
            {/* <Button onClick={fetchMembers} variant="destructive" size="sm">
              {t('common:retry', 'Try Again')}
            </Button> */}
          </div>
        </div>
      ) : filteredMembers.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('members:name', 'Name')}</TableHead>
                <TableHead>{t('members:contact', 'Contact')}</TableHead>
                <TableHead className="text-center">{t('members:status')}</TableHead>
                <TableHead className="text-center">{t('members:emailStatus', 'Email Status')}</TableHead>
                <TableHead>{t('members:joinDate')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMembers.map((member) => (
                <TableRow
                  key={member.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleMemberClick(member)}
                >
                  <TableCell>
                    <div className="font-medium">
                      {member.firstName} {member.lastName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{member.phone || t('common:noPhoneNumber', "No phone")}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className={member.email && member.emailPreference?.isSubscribed === false ? "line-through text-muted-foreground" : ""}>
                          {member.email || t('common:noEmailAddress', "No email")}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        member.membershipStatus === "Member"
                          ? "default"
                          : member.membershipStatus === "Visitor"
                            ? "secondary"
                            : "outline"
                      }
                      className={
                        member.membershipStatus === "Member"
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : member.membershipStatus === "Visitor"
                            ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                            : ""
                      }
                    >
                      {getStatusText(member.membershipStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {member.email ? (
                      member.emailPreference?.isSubscribed === false ? (
                        <div className="flex items-center justify-center gap-1">
                          <MailX className="h-4 w-4 text-red-500" />
                          <span className="text-xs text-red-500 font-medium">{t('members:unsubscribed', 'Unsubscribed')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <Mail className="h-4 w-4 text-green-600" />
                          <span className="text-xs text-green-600 font-medium">{t('members:subscribed', 'Subscribed')}</span>
                        </div>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      logger.debug('[Table] member.joinDate', {
                        operation: 'ui.member.join_date_debug',
                        joinDate: member.joinDate,
                        joinDateType: typeof member.joinDate
                      });
                      const joinDate = member.joinDate as Date | string | null | undefined;
                      // Check if it looks like a Date object and is valid
                      if (joinDate && typeof (joinDate as Date).getTime === 'function' && !isNaN((joinDate as Date).getTime())) {
                        // The 'joinDate' variable here is already confirmed to be a valid Date object
                        // representing a UTC timestamp (e.g., 2025-05-14T00:00:00.000Z).
                        // We want to display the calendar date as it is in UTC, regardless of local timezone.
                        const year = (joinDate as Date).getUTCFullYear();
                        const month = (joinDate as Date).getUTCMonth(); // 0-indexed
                        const day = (joinDate as Date).getUTCDate();
                        // Construct a new Date object using these UTC components.
                        // new Date(year, month, day) creates a date at 00:00:00 in the *local* timezone.
                        // This is what we want for display, so "May 14" is shown for "May 14 UTC".
                        const localDateToDisplay = new Date(year, month, day);
                        return format(localDateToDisplay, "PP");
                      } else if (!member.joinDate) {
                        return t('common:notApplicable', 'N/A'); // Handle null/undefined
                      } else {
                          logger.error('Member lastName is not a string', { operation: 'ui.member.lastname_error', lastName: member.lastName, type: typeof member.lastName });
                        return t('common:invalidDate', 'Invalid Date'); 
                      }
                    })()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex min-h-[300px] items-center justify-center rounded-md border border-dashed p-4 sm:p-8 text-center">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <h3 className="mt-4 text-lg font-semibold">{t('members:empty.title', 'No members found')}</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
              {searchTerm ? t('members:empty.adjustSearch', "Try adjusting your search terms.") : t('members:empty.addFirst', "Add your first member to get started.")}
            </p>
            {/* Remove AddMemberButton from empty state */}
            {/* <AddMemberButton onMemberAdded={handleAddMemberSuccess} /> */}
          </div>
        </div>
      )}

      {filteredMembers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 border-t mt-4 pt-4">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{filteredMembers.length > 0 ? startIndex + 1 : 0}</span> to{" "}
            <span className="font-medium">{endIndex + 1}</span> of{" "}
            <span className="font-medium">{filteredMembers.length}</span> items
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                aria-label="First page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={prevPage}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center">
                {getPageNumbers().map((page, index) => {
                  if (page < 0) {
                    // Render ellipsis
                    return (
                      <span key={`ellipsis-${index}`} className="px-2">
                        ...
                      </span>
                    )
                  }

                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="icon"
                      onClick={() => goToPage(page)}
                      className="h-8 w-8"
                      aria-label={`Page ${page}`}
                      aria-current={currentPage === page ? "page" : undefined}
                    >
                      {page}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={nextPage}
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                aria-label="Last page"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>

            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value))
                setCurrentPage(1) // Reset to first page when changing items per page
              }}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder={itemsPerPage} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 per page</SelectItem>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Member Details Drawer */}
      {selectedMember && (
        <MemberDetailsDrawer
          member={selectedMember}
          open={showMemberDetails}
          onClose={() => setShowMemberDetails(false)}
          onActionComplete={onActionComplete}
        />
      )}
    </div>
  )
}

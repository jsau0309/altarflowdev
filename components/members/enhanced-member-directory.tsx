"use client"

import { useState, useEffect } from "react"
import { Search, Filter, Phone, Mail } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { type Member } from "@/lib/types"
import { mockDataService } from "@/lib/mock-data"
import { MemberDetailsDrawer } from "./member-details-drawer"
import { AddMemberButton } from "./add-member-button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Add a new prop to control whether to show the Add Member button
interface EnhancedMemberDirectoryProps {
  showAddButton?: boolean
}

export function EnhancedMemberDirectory({ showAddButton = true }: EnhancedMemberDirectoryProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [showMemberDetails, setShowMemberDetails] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    // Simulate API loading delay
    const timer = setTimeout(() => {
      setMembers(mockDataService.getMembers())
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  // Filter members based on search term
  const filteredMembers = members.filter((member) => {
    if (!searchTerm) return true

    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase()
    const searchLower = searchTerm.toLowerCase()

    return (
      fullName.includes(searchLower) ||
      (member.email && member.email.toLowerCase().includes(searchLower)) ||
      (member.phone && member.phone.toLowerCase().includes(searchLower))
    )
  })

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / itemsPerPage))

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

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

  const handleAddMemberSuccess = () => {
    // Refresh the member list
    setMembers(mockDataService.getMembers())
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search members..."
            className="w-full rounded-md pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          {showAddButton && <AddMemberButton onMemberAdded={handleAddMemberSuccess} />}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-10 bg-muted animate-pulse rounded-md"></div>
          <div className="h-10 bg-muted animate-pulse rounded-md"></div>
          <div className="h-10 bg-muted animate-pulse rounded-md"></div>
        </div>
      ) : filteredMembers.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Join Date</TableHead>
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
                        <span>{member.phone || "No phone"}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span>{member.email || "No email"}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        member.membershipStatus === "active"
                          ? "default"
                          : member.membershipStatus === "new"
                            ? "secondary"
                            : "outline"
                      }
                      className={
                        member.membershipStatus === "active"
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : member.membershipStatus === "new"
                            ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                            : ""
                      }
                    >
                      {member.membershipStatus ? member.membershipStatus.charAt(0).toUpperCase() + member.membershipStatus.slice(1) : 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(member.joinDate), "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex min-h-[300px] items-center justify-center rounded-md border border-dashed p-4 sm:p-8 text-center">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <h3 className="mt-4 text-lg font-semibold">No members found</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
              {searchTerm ? "Try adjusting your search terms." : "Add your first member to get started."}
            </p>
            <AddMemberButton onMemberAdded={handleAddMemberSuccess} />
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
        />
      )}
    </div>
  )
}

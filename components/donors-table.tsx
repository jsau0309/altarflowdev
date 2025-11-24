"use client"

import { DonorFE } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ArrowUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";

interface DonorsTableProps {
  donors: DonorFE[];
  onEdit: (donor: DonorFE) => void;
  onViewDetails: (donorId: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortChange: (order: 'asc' | 'desc') => void;
}

export function DonorsTable({ donors, onEdit, onViewDetails, sortOrder, onSortChange }: DonorsTableProps) {
  const { t } = useTranslation('donations');

  // Format phone number to +1 (XXX) XXX-XXXX
  const formatPhoneNumber = (phone: string | null | undefined): string => {
    if (!phone) return '';

    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Check if it's a US number (starts with 1 and has 11 digits, or has 10 digits)
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      // Format: +1 (XXX) XXX-XXXX
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 11)}`;
    } else if (cleaned.length === 10) {
      // Format: +1 (XXX) XXX-XXXX
      return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }

    // Return original if it doesn't match expected format
    return phone;
  };

  // Determine donor type and return badge configuration
  const getDonorType = (donor: DonorFE): { label: string; color: string } => {
    // Linked to Member: Has memberId
    if (donor.memberId) {
      return { label: t('donorTypes.linkedToMember', 'Linked to Member'), color: 'bg-yellow-500' }; // Gold
    }

    // Manual: Has churchId but no memberId
    if (donor.churchId && !donor.memberId) {
      return { label: t('donorTypes.manual', 'Manual'), color: 'bg-green-500' }; // Green
    }

    // Digital: No churchId and no memberId
    return { label: t('donorTypes.digital', 'Digital'), color: 'bg-blue-500' }; // Blue
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button
                onClick={() => onSortChange(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                {t('donorsTable.headers.name', 'Name')}
                <ArrowUpDown className="h-4 w-4" />
              </button>
            </TableHead>
            <TableHead>{t('donorsTable.headers.type', 'Type')}</TableHead>
            <TableHead>{t('donorsTable.headers.email', 'Email')}</TableHead>
            <TableHead>{t('donorsTable.headers.phone', 'Phone')}</TableHead>
            <TableHead>{t('donorsTable.headers.dateAdded', 'Date Added')}</TableHead>
            <TableHead>
              <span className="sr-only">{t('donorsTable.headers.actions', 'Actions')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {donors.length > 0 ? (
            donors.map((donor) => (
              <TableRow key={donor.id}>
                <TableCell className="font-medium">{[donor.firstName, donor.lastName].filter(Boolean).join(' ')}</TableCell>
                <TableCell>
                  {(() => {
                    const donorType = getDonorType(donor);
                    return (
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${donorType.color}`} />
                        <span className="text-sm">{donorType.label}</span>
                      </div>
                    );
                  })()}
                </TableCell>
                <TableCell>{donor.email || '—'}</TableCell>
                <TableCell>{donor.phone ? formatPhoneNumber(donor.phone) : '—'}</TableCell>
                <TableCell>{new Date(donor.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t('donorTableActions.actions', 'Actions')}</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onEdit(donor)}>
                        {t('donorTableActions.edit', 'Edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onViewDetails(donor.id)}>{t('donorTableActions.viewDetails', 'View Details')}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                {t('donorsTable.noResults', 'No donors found.')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

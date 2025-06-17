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
import { MoreHorizontal } from "lucide-react";
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
}

export function DonorsTable({ donors, onEdit, onViewDetails }: DonorsTableProps) {
  const { t } = useTranslation('donations');

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('donorsTable.headers.name', 'Name')}</TableHead>
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
                <TableCell>{donor.email}</TableCell>
                <TableCell>{donor.phone}</TableCell>
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
              <TableCell colSpan={5} className="h-24 text-center">
                {t('donorsTable.noResults', 'No donors found.')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

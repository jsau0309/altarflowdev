import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonRowProps {
  columnCount: number;
}

export const TableSkeletonRow: React.FC<TableSkeletonRowProps> = ({ columnCount }) => {
  return (
    <TableRow>
      {Array.from({ length: columnCount }).map((_, index) => (
        <TableCell key={index}>
          <Skeleton className="h-5 w-full" />
        </TableCell>
      ))}
    </TableRow>
  );
};

interface TableSkeletonProps {
  columnCount: number;
  rowCount: number;
  header?: React.ReactNode; // Optional header component
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ columnCount, rowCount, header }) => {
  return (
    <>
      {header}
      {Array.from({ length: rowCount }).map((_, index) => (
        <TableSkeletonRow key={index} columnCount={columnCount} />
      ))}
    </>
  );
};

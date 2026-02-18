import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function DataTable({ columns, data, isLoading, onRowClick, emptyMessage = "No data / Nincs adat" }) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#2d333b] bg-[#1a1e23] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-[#2d333b] hover:bg-transparent">
              {columns.map((col, i) => (
                <TableHead key={i} className="text-[#8b949e] text-xs uppercase tracking-wide font-medium">
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(5).fill(0).map((_, i) => (
              <TableRow key={i} className="border-[#2d333b]">
                {columns.map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-24 bg-[#22272e]" /></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#2d333b] bg-[#1a1e23] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-[#2d333b] hover:bg-transparent">
            {columns.map((col, i) => (
              <TableHead key={i} className="text-[#8b949e] text-xs uppercase tracking-wide font-medium bg-[#22272e]/50">
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow className="border-[#2d333b]">
              <TableCell colSpan={columns.length} className="text-center text-[#8b949e] py-12">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow
                key={row.id || i}
                className={`border-[#2d333b] transition-colors ${
                  onRowClick ? "cursor-pointer hover:bg-[#22272e]" : ""
                }`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col, j) => (
                  <TableCell key={j} className="text-[#e6edf3] text-sm">
                    {col.render ? col.render(row) : row[col.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
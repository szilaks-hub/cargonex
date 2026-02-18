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
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 hover:bg-transparent bg-slate-50">
              {columns.map((col, i) => (
                <TableHead key={i} className="text-slate-500 text-xs uppercase tracking-wide font-semibold">
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(5).fill(0).map((_, i) => (
              <TableRow key={i} className="border-slate-100">
                {columns.map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-24 bg-slate-100" /></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden shadow-sm" style={{ background: "#f0f2f5", borderColor: "#d0d4db" }}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent" style={{ borderColor: "#d0d4db" }}>
            {columns.map((col, i) => (
              <TableHead key={i} className="text-slate-500 text-xs uppercase tracking-wide font-semibold" style={{ background: "#e4e7ec" }}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow className="border-slate-100">
              <TableCell colSpan={columns.length} className="text-center text-slate-400 py-14 text-sm">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow
                key={row.id || i}
                className={`border-slate-100 transition-colors ${
                  onRowClick ? "cursor-pointer hover:bg-blue-50/60" : "hover:bg-slate-50"
                }`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col, j) => (
                  <TableCell key={j} className="text-slate-700 text-sm">
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
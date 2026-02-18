import React from "react";
import { Badge } from "@/components/ui/badge";

const statusStyles = {
  active:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive:   "bg-slate-100 text-slate-500 border-slate-200",
  draft:      "bg-amber-50 text-amber-700 border-amber-200",
  confirmed:  "bg-blue-50 text-blue-700 border-blue-200",
  partial:    "bg-orange-50 text-orange-700 border-orange-200",
  completed:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled:  "bg-red-50 text-red-700 border-red-200",
  expired:    "bg-red-50 text-red-700 border-red-200",
  scheduled:  "bg-blue-50 text-blue-700 border-blue-200",
  loaded:     "bg-orange-50 text-orange-700 border-orange-200",
  in_transit: "bg-violet-50 text-violet-700 border-violet-200",
  customs:    "bg-amber-50 text-amber-700 border-amber-200",
  closed:     "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function StatusBadge({ status }) {
  const style = statusStyles[status] || statusStyles.active;
  return (
    <Badge variant="outline" className={`${style} border text-xs capitalize font-medium`}>
      {status?.replace(/_/g, " ")}
    </Badge>
  );
}
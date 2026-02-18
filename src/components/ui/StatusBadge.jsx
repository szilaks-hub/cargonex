import React from "react";
import { Badge } from "@/components/ui/badge";

const statusStyles = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  inactive: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  draft: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  confirmed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  partial: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
  expired: "bg-red-500/10 text-red-400 border-red-500/20",
  scheduled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  loaded: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  in_transit: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  customs: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  closed: "bg-green-500/10 text-green-400 border-green-500/20",
};

export default function StatusBadge({ status }) {
  const style = statusStyles[status] || statusStyles.active;
  return (
    <Badge variant="outline" className={`${style} border text-xs capitalize`}>
      {status?.replace(/_/g, " ")}
    </Badge>
  );
}
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function PageHeader({ title, subtitle, onAdd, addLabel }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h2 className="text-xl font-bold text-[#e6edf3]">{title}</h2>
        {subtitle && <p className="text-sm text-[#8b949e] mt-0.5">{subtitle}</p>}
      </div>
      {onAdd && (
        <Button
          onClick={onAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-lg shadow-blue-600/20 transition-all duration-200 hover:shadow-blue-600/40"
        >
          <Plus className="w-4 h-4" />
          {addLabel || "Add New / Új hozzáadása"}
        </Button>
      )}
    </div>
  );
}
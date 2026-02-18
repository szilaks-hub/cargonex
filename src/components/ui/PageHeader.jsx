import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function PageHeader({ title, subtitle, onAdd, addLabel = "Add New / Hozzáadás" }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {onAdd && (
        <Button
          onClick={onAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          {addLabel}
        </Button>
      )}
    </div>
  );
}
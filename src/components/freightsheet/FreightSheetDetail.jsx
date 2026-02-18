import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Edit2, Trash2 } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import FreightSheetLineEditor from "./FreightSheetLineEditor";
import FreightSheetPrint from "./FreightSheetPrint";
import FreightSheetForm from "./FreightSheetForm";

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-700 mt-0.5">{value || "–"}</p>
    </div>
  );
}

export default function FreightSheetDetail({ sheet, onBack, onUpdated }) {
  const [printing, setPrinting] = useState(false);
  const [editing, setEditing] = useState(false);
  const qc = useQueryClient();

  const handleDelete = async () => {
    if (!confirm("Delete this freight sheet?")) return;
    await base44.entities.FreightSheet.delete(sheet.id);
    onBack();
  };

  if (printing) return <FreightSheetPrint sheet={sheet} onClose={() => setPrinting(false)} />;

  if (editing) return (
    <FreightSheetForm
      item={sheet}
      onClose={() => setEditing(false)}
      onSaved={() => { setEditing(false); qc.invalidateQueries({ queryKey: ["freightSheets"] }); onUpdated && onUpdated(); }}
    />
  );

  const validityText = sheet.open_ended
    ? `${sheet.valid_from} – visszavonásig`
    : `${sheet.valid_from}${sheet.valid_to ? ` – ${sheet.valid_to}` : ""}`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack} className="text-slate-500 hover:text-slate-800 p-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800">
              {sheet.sheet_number || `FS-${sheet.id?.slice(0, 6)}`}
            </h2>
            <StatusBadge status={sheet.status} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {sheet.carrier_name} → {sheet.destination_country}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing(true)} className="border-slate-300 gap-2 text-sm">
            <Edit2 className="w-4 h-4" /> Edit
          </Button>
          <Button onClick={() => setPrinting(true)} className="bg-slate-800 hover:bg-slate-900 text-white gap-2 text-sm">
            <Printer className="w-4 h-4" /> Nyilatkozat
          </Button>
          <Button variant="ghost" onClick={handleDelete} className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1 text-sm">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 shadow-sm">
        <InfoRow label="Carrier / Fuvarozó" value={sheet.carrier_name} />
        <InfoRow label="Supplier / Beszállító" value={sheet.supplier_name} />
        <InfoRow label="Loading Site / Telephely" value={`${sheet.supplier_location_name || "–"} ${sheet.origin_country ? `(${sheet.origin_country})` : ""}`} />
        <InfoRow label="Destination / Célország" value={sheet.destination_country} />
        <InfoRow label="Validity / Érvényesség" value={validityText} />
        <InfoRow label="Incoterms" value={sheet.incoterms} />
        <InfoRow label="Currency / Deviza" value={sheet.currency} />
        <InfoRow label="Default Load / Alap kit." value={sheet.default_load_tons ? `${sheet.default_load_tons} t` : "24 t"} />
        {sheet.notes && <div className="col-span-2 lg:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Notes</p>
          <p className="text-sm text-slate-500 mt-0.5 italic">{sheet.notes}</p>
        </div>}
      </div>

      {/* Lines */}
      <FreightSheetLineEditor sheet={sheet} />
    </div>
  );
}
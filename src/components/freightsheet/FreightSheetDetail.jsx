import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Edit2 } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import FreightSheetLineEditor from "./FreightSheetLineEditor";
import FreightSheetPrint from "./FreightSheetPrint";
import FreightSheetForm from "./FreightSheetForm";

export default function FreightSheetDetail({ sheet, onBack, onUpdated }) {
  const [showPrint, setShowPrint] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const { data: lines = [] } = useQuery({
    queryKey: ["sheetLines", sheet.id],
    queryFn: () => base44.entities.FreightSheetLine.filter({ sheet_id: sheet.id }, "sort_order"),
  });

  const activeCount = lines.filter(l => l.is_active !== false).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack} className="text-slate-500 hover:text-slate-800 p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-800">
                {sheet.carrier_name} → {sheet.destination_country}
              </h2>
              <StatusBadge status={sheet.status} />
              {sheet.sheet_number && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">{sheet.sheet_number}</span>}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {sheet.supplier_name && <span>{sheet.supplier_name} · </span>}
              {sheet.supplier_site_name && <span>{sheet.supplier_site_name} · </span>}
              {sheet.valid_from} {sheet.valid_until_revoked ? "→ visszavonásig" : `→ ${sheet.valid_to || "?"}`}
              {sheet.incoterms && <span> · {sheet.incoterms}</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEdit(true)} className="gap-2 border-[#c6ccda] text-slate-600">
            <Edit2 className="w-3.5 h-3.5" /> Edit Header
          </Button>
          <Button onClick={() => setShowPrint(true)} className="gap-2 text-white" style={{background: "linear-gradient(135deg,#e05a2b,#c0392b)"}}>
            <Printer className="w-4 h-4" /> Nyomtatás
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="cx-glass px-5 py-3 flex gap-6 flex-wrap text-sm">
        <div><span className="text-slate-400 text-xs">Alap kiterh.</span><div className="font-semibold text-slate-700">{sheet.default_load_tons} t</div></div>
        <div><span className="text-slate-400 text-xs">Deviza</span><div className="font-semibold text-slate-700">{sheet.currency}</div></div>
        <div><span className="text-slate-400 text-xs">Aktív sorok</span><div className="font-semibold text-slate-700">{activeCount} / {lines.length}</div></div>
        <div><span className="text-slate-400 text-xs">Incoterms</span><div className="font-semibold text-slate-700">{sheet.incoterms || "-"}</div></div>
        {sheet.origin_city && <div><span className="text-slate-400 text-xs">Rakodás</span><div className="font-semibold text-slate-700">{sheet.origin_city}</div></div>}
        {sheet.notes && <div><span className="text-slate-400 text-xs">Megjegyzés</span><div className="font-semibold text-slate-700">{sheet.notes}</div></div>}
      </div>

      {/* Edit form */}
      {showEdit && (
        <FreightSheetForm
          item={sheet}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); onUpdated(); }}
        />
      )}

      {/* Line editor */}
      <div className="cx-table-wrap">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Fuvar sorok / Freight Lines</h3>
          <span className="text-xs text-slate-400">Soronként mentés a 💾 ikonnal · Új sor az utolsó kék sorban</span>
        </div>
        <FreightSheetLineEditor sheet={sheet} />
      </div>

      {/* Print modal */}
      {showPrint && (
        <FreightSheetPrint sheet={sheet} lines={lines} onClose={() => setShowPrint(false)} />
      )}
    </div>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Copy } from "lucide-react";

export default function CopyLinesModal({ currentSheetId, onClose, onCopied }) {
  const [selectedSheetId, setSelectedSheetId] = useState("");
  const [copying, setCopying] = useState(false);

  const { data: sheets = [] } = useQuery({
    queryKey: ["freightSheets"],
    queryFn: () => base44.entities.FreightSheet.list("-valid_from"),
  });

  const otherSheets = sheets.filter(s => s.id !== currentSheetId);

  const { data: previewLines = [] } = useQuery({
    queryKey: ["sheetLines", selectedSheetId],
    queryFn: () => base44.entities.FreightSheetLine.filter({ sheet_id: selectedSheetId }, "sort_order"),
    enabled: !!selectedSheetId,
  });

  const handleCopy = async () => {
    if (!selectedSheetId || previewLines.length === 0) return;
    setCopying(true);
    const newLines = previewLines.map(({ id, created_date, updated_date, created_by, sheet_id, ...rest }) => ({
      ...rest,
      sheet_id: currentSheetId,
    }));
    await base44.entities.FreightSheetLine.bulkCreate(newLines);
    setCopying(false);
    onCopied();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-[#f5f7fa] border border-[rgba(46,58,90,0.12)] rounded-xl p-6 w-full max-w-lg shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Sorok másolása másik lapból</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Forrás lap kiválasztása</label>
          <Select value={selectedSheetId} onValueChange={setSelectedSheetId}>
            <SelectTrigger className="bg-white border-[#c6ccda]">
              <SelectValue placeholder="Válassz lapot..." />
            </SelectTrigger>
            <SelectContent className="bg-white border-[#c6ccda]">
              {otherSheets.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.carrier_name} → {s.destination_country} · {s.valid_from} [{s.status}]
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedSheetId && (
          <div className="bg-white border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto">
            {previewLines.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Nincs sor ezen a lapon</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-100">
                    <th className="text-left py-1 pr-3">ISZ</th>
                    <th className="text-left py-1 pr-3">Város</th>
                    <th className="text-left py-1 pr-3">Vármegye</th>
                    <th className="text-right py-1">Összesen</th>
                  </tr>
                </thead>
                <tbody>
                  {previewLines.map(l => (
                    <tr key={l.id} className="border-b border-slate-50">
                      <td className="py-1 pr-3 font-mono text-slate-500">{l.destination_zip || "-"}</td>
                      <td className="py-1 pr-3 font-medium text-slate-700">{l.destination_city}</td>
                      <td className="py-1 pr-3 text-slate-500">{l.destination_county || "-"}</td>
                      <td className="py-1 text-right text-slate-700">{(l.total_price || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="border-[#c6ccda] text-slate-600">Mégse</Button>
          <Button
            onClick={handleCopy}
            disabled={!selectedSheetId || previewLines.length === 0 || copying}
            className="gap-2"
            style={{ background: "linear-gradient(135deg,#e05a2b,#c0392b)", color: "#fff" }}
          >
            <Copy className="w-4 h-4" />
            {copying ? "Másolás..." : `${previewLines.length} sor másolása`}
          </Button>
        </div>
      </div>
    </div>
  );
}
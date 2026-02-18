import React, { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

export default function FreightSheetPrint({ sheet, onClose }) {
  const printRef = useRef();

  const { data: lines = [] } = useQuery({
    queryKey: ["sheetLines", sheet.id],
    queryFn: () => base44.entities.FreightSheetLine.filter({ sheet_id: sheet.id }, "sort_order"),
  });

  const activeLines = lines.filter(l => l.is_active !== false);

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>Fuvardíj nyilatkozat</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #000; padding: 20mm; margin: 0; }
        h1 { font-size: 16px; text-align: center; margin-bottom: 4px; }
        h2 { font-size: 13px; text-align: center; color: #444; margin-bottom: 16px; }
        .header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; font-size: 11px; }
        .header-grid div { padding: 4px 6px; border: 1px solid #ccc; }
        .header-grid label { font-weight: bold; display: block; font-size: 10px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { background: #f0f0f0; border: 1px solid #ccc; padding: 5px 6px; font-size: 10px; text-align: center; }
        td { border: 1px solid #ccc; padding: 5px 6px; font-size: 11px; }
        td.num { text-align: right; }
        .footer { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; font-size: 11px; }
        .sig-line { border-top: 1px solid #000; margin-top: 32px; padding-top: 4px; text-align: center; font-size: 10px; color: #555; }
        .validity { margin-top: 14px; font-size: 11px; font-style: italic; color: #555; text-align: center; }
        @media print { body { padding: 15mm; } }
      </style></head><body>${content}</body></html>
    `);
    w.document.close();
    w.print();
  };

  const validityText = sheet.open_ended
    ? "Visszavonásig érvényes / Valid until revoked"
    : `${sheet.valid_from} – ${sheet.valid_to}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800">Print Preview – Fuvardíj Nyilatkozat</h3>
        <div className="flex gap-2">
          <Button onClick={handlePrint} className="bg-slate-800 hover:bg-slate-900 text-white gap-2 text-sm">
            <Printer className="w-4 h-4" /> Nyomtatás
          </Button>
          <Button variant="outline" onClick={onClose} className="border-slate-300 gap-2 text-sm">
            <X className="w-4 h-4" /> Vissza
          </Button>
        </div>
      </div>

      {/* Print content */}
      <div ref={printRef} className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-sm text-slate-800 space-y-4">
        <h1 className="text-xl font-bold text-center tracking-wide uppercase">Fuvardíj Nyilatkozat</h1>
        <h2 className="text-center text-slate-500 font-normal text-sm">Freight Rate Declaration</h2>

        <div className="grid grid-cols-2 gap-3 text-xs border border-slate-200 rounded-lg p-4 bg-slate-50">
          <div>
            <label className="font-bold text-slate-500 uppercase text-[10px]">Fuvarozó / Carrier</label>
            <p className="font-semibold mt-0.5">{sheet.carrier_name || "–"}</p>
          </div>
          <div>
            <label className="font-bold text-slate-500 uppercase text-[10px]">Beszállító / Supplier</label>
            <p className="font-semibold mt-0.5">{sheet.supplier_name || "–"}</p>
          </div>
          <div>
            <label className="font-bold text-slate-500 uppercase text-[10px]">Feladóhely / Loading Site</label>
            <p className="font-semibold mt-0.5">{sheet.supplier_location_name || "–"} {sheet.origin_country ? `(${sheet.origin_country})` : ""}</p>
          </div>
          <div>
            <label className="font-bold text-slate-500 uppercase text-[10px]">Célország / Destination Country</label>
            <p className="font-semibold mt-0.5">{sheet.destination_country || "–"}</p>
          </div>
          <div>
            <label className="font-bold text-slate-500 uppercase text-[10px]">Paritás / Incoterms</label>
            <p className="font-semibold mt-0.5">{sheet.incoterms || "–"}</p>
          </div>
          <div>
            <label className="font-bold text-slate-500 uppercase text-[10px]">Deviza / Currency</label>
            <p className="font-semibold mt-0.5">{sheet.currency}</p>
          </div>
          <div className="col-span-2">
            <label className="font-bold text-slate-500 uppercase text-[10px]">Érvényesség / Validity</label>
            <p className="font-semibold mt-0.5">{validityText}</p>
          </div>
        </div>

        {sheet.notes && (
          <div className="text-xs text-slate-500 italic border-l-2 border-slate-300 pl-3">{sheet.notes}</div>
        )}

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 p-2 text-left">Város / City</th>
              <th className="border border-slate-300 p-2 text-left">Vármegye / Régió</th>
              <th className="border border-slate-300 p-2 text-right">ISZ</th>
              <th className="border border-slate-300 p-2 text-right">Határig ({sheet.currency})</th>
              <th className="border border-slate-300 p-2 text-right">Határtól ({sheet.currency})</th>
              <th className="border border-slate-300 p-2 text-right font-bold">Összesen</th>
              <th className="border border-slate-300 p-2 text-right">Kit. (t)</th>
              <th className="border border-slate-300 p-2 text-right">EUR/to</th>
            </tr>
          </thead>
          <tbody>
            {activeLines.map((line, idx) => {
              const load = line.load_tons || sheet.default_load_tons || 24;
              const total = line.total_price ?? ((line.foreign_leg_price || 0) + (line.domestic_leg_price || 0));
              const ept = line.eur_per_ton ?? (load > 0 ? (total / load).toFixed(2) : "-");
              return (
                <tr key={line.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="border border-slate-200 p-2 font-medium">{line.destination_city}</td>
                  <td className="border border-slate-200 p-2 text-slate-500">{line.destination_county || line.destination_region || "–"}</td>
                  <td className="border border-slate-200 p-2 text-right text-slate-500">{line.destination_zip || "–"}</td>
                  <td className="border border-slate-200 p-2 text-right">{(line.foreign_leg_price || 0).toLocaleString()}</td>
                  <td className="border border-slate-200 p-2 text-right">{(line.domestic_leg_price || 0).toLocaleString()}</td>
                  <td className="border border-slate-200 p-2 text-right font-bold text-blue-700">{total.toLocaleString()}</td>
                  <td className="border border-slate-200 p-2 text-right">{load}</td>
                  <td className="border border-slate-200 p-2 text-right font-semibold text-orange-600">{Number(ept).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="text-center text-xs text-slate-400 italic mt-2">{validityText}</p>

        <div className="grid grid-cols-2 gap-16 mt-8 pt-4">
          <div>
            <div className="border-t border-slate-400 pt-2 text-center text-xs text-slate-500">Fuvarozó aláírása / Carrier Signature</div>
            <div className="text-center text-xs text-slate-400 mt-1">{sheet.carrier_name}</div>
          </div>
          <div>
            <div className="border-t border-slate-400 pt-2 text-center text-xs text-slate-500">Megrendelő aláírása / Client Signature</div>
            <div className="text-center text-xs text-slate-400 mt-1">{sheet.supplier_name || "Steel-Transz"}</div>
          </div>
        </div>
        <div className="text-center text-xs text-slate-400 mt-4">
          Dátum / Date: {new Date().toLocaleDateString("hu-HU")} &nbsp;|&nbsp; Lap: {sheet.sheet_number || "–"}
        </div>
      </div>
    </div>
  );
}
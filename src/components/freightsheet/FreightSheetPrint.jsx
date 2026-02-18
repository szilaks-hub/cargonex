import React from "react";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

const COUNTRY_NAMES = {
  HU: "Magyarország", SK: "Szlovákia", RO: "Románia", PL: "Lengyelország",
  HR: "Horvátország", SI: "Szlovénia", RS: "Szerbia", AT: "Ausztria",
  DE: "Németország", CZ: "Csehország", BG: "Bulgária"
};

export default function FreightSheetPrint({ sheet, lines, onClose }) {
  const activeLines = lines.filter(l => l.is_active !== false);
  const today = new Date().toLocaleDateString("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit" });

  const validityText = sheet.valid_until_revoked
    ? "Jelen nyilatkozat visszavonásig érvényes."
    : `Jelen nyilatkozat ${sheet.valid_from} – ${sheet.valid_to} között érvényes.`;

  const destCountryName = COUNTRY_NAMES[sheet.destination_country] || sheet.destination_country;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-auto py-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4">
        {/* Controls (hidden in print) */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <Button onClick={() => window.print()} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Printer className="w-4 h-4" /> Nyomtatás
            </Button>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>

        {/* Print content */}
        <div id="print-area" className="p-10 text-[13px] text-slate-900 print:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_695955de68183bcabeb8b12f/3e4f22a2f_CARGONEXv.png"
                alt="CARGONEX"
                className="h-14 object-contain mb-2"
              />
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">NYILATKOZAT</p>
            </div>
            <div className="text-right text-xs text-slate-500">
              {sheet.sheet_number && <p className="font-semibold text-slate-700">Lap: {sheet.sheet_number}</p>}
              <p>Dátum: {today}</p>
            </div>
          </div>

          {/* Intro paragraph */}
          <div className="mb-6 text-sm leading-relaxed text-slate-700">
            <p>
              A Steel-Transz Kft. (Címe: 2371 Dabas, Kandó Kálmán u. 6.), ezen nyilatkozatával kijelenti, hogy a{" "}
              <strong>{sheet.supplier_name || "—"}</strong>
              {sheet.origin_address ? ` (${sheet.origin_address})` : ""} - től vásárolt árú, mely Szerbiából jön és{" "}
              <strong>{sheet.incoterms}</strong>{sheet.origin_city ? ` ${sheet.origin_city}` : ""} paritással van ellátva, és a listán szereplő{" "}
              <strong>{destCountryName}</strong> helyszínekre megy, azoknál a következő fuvardíjakkal kell számolni:
            </p>
          </div>

          {/* Table */}
          <div className="mb-6">
            <h3 className="text-center font-semibold text-sm mb-3">Fuvardíj nyilatkozat.</h3>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  {sheet.destination_country === "HU" && <th className="text-left py-2 pr-3 font-semibold text-slate-700">Megye</th>}
                  <th className="text-left py-2 pr-3 font-semibold text-slate-700">Város</th>
                  <th className="text-right py-2 pr-3 font-semibold text-slate-700">Ár:</th>
                  <th className="text-right py-2 pr-3 font-semibold text-slate-700">Szerb határig:</th>
                  <th className="text-right py-2 pr-3 font-semibold text-slate-700">Szerb határtól:</th>
                  <th className="text-right py-2 pr-3 font-semibold text-slate-700">Kiterh:</th>
                  <th className="text-right py-2 font-semibold text-slate-700">Eur/To.</th>
                </tr>
              </thead>
              <tbody>
                {activeLines.map((line, i) => {
                  const load = line.load_tons || sheet.default_load_tons || 24;
                  const total = (line.domestic_leg || 0) + (line.foreign_leg || 0);
                  const eurPerTon = load > 0 ? total / load : 0;
                  return (
                    <tr key={line.id || i} className={`border-b border-slate-100 ${i % 2 === 0 ? "" : "bg-slate-50"}`}>
                      {sheet.destination_country === "HU" && (
                        <td className="py-1.5 pr-3 font-semibold">{line.destination_county || ""}</td>
                      )}
                      <td className="py-1.5 pr-3">{line.destination_city}</td>
                      <td className="py-1.5 pr-3 text-right">{total.toLocaleString("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                      <td className="py-1.5 pr-3 text-right">{(line.domestic_leg || 0).toLocaleString("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                      <td className="py-1.5 pr-3 text-right">{(line.foreign_leg || 0).toLocaleString("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                      <td className="py-1.5 pr-3 text-right">{load}</td>
                      <td className="py-1.5 text-right">{eurPerTon.toLocaleString("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-8">
            <p className="text-sm text-slate-700 mb-8">{validityText}</p>
            <div className="flex items-end justify-between">
              <p className="font-semibold text-slate-800">{sheet.valid_from || today}</p>
              <div className="text-center">
                <div className="border-t border-slate-400 pt-2 w-48 mx-auto">
                  <p className="text-xs text-slate-500">Szilák Sándor</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
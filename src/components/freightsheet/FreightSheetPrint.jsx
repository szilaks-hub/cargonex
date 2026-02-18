import React from "react";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

const COUNTRY_NAMES = {
  HU: "Magyarország", SK: "Szlovákia", RO: "Románia", PL: "Lengyelország",
  HR: "Horvátország", SI: "Szlovénia", RS: "Szerbia", AT: "Ausztria",
  DE: "Németország", CZ: "Csehország", BG: "Bulgária", UA: "Ukrajna",
  BA: "Bosznia-Hercegovina", ME: "Montenegró", MK: "Észak-Macedónia", AL: "Albánia"
};

export default function FreightSheetPrint({ sheet, lines, onClose }) {
  const activeLines = lines.filter(l => l.is_active !== false);
  const today = new Date().toLocaleDateString("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit" });
  const isHU = sheet.destination_country === "HU";

  const validityText = sheet.valid_until_revoked
    ? "Jelen nyilatkozat visszavonásig érvényes."
    : `Jelen nyilatkozat ${sheet.valid_from} – ${sheet.valid_to || "?"} között érvényes.`;

  const destCountryName = COUNTRY_NAMES[sheet.destination_country] || sheet.destination_country;

  return (
    <>
      {/* Print styles injected globally */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #freight-print-root { display: block !important; position: fixed; inset: 0; z-index: 9999; background: white; }
          #freight-print-controls { display: none !important; }
          .print-page { padding: 24mm 20mm; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
        }
      `}</style>

      <div id="freight-print-root" className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-auto py-6">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4">

          {/* Controls */}
          <div id="freight-print-controls" className="flex items-center justify-between px-6 py-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Button onClick={() => window.print()} className="gap-2" style={{ background: "linear-gradient(135deg,#1d4ed8,#1e40af)", color: "#fff" }}>
                <Printer className="w-4 h-4" /> Nyomtatás / PDF
              </Button>
              <span className="text-xs text-slate-400">A böngésző nyomtatási párbeszédpanelén válaszd: „Mentés PDF-ként"</span>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
          </div>

          {/* Document */}
          <div className="print-page p-10 text-[13px] text-slate-900 font-sans">

            {/* ── HEADER ───────────────────────────────────────────── */}
            <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-slate-200">
              <div>
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_695955de68183bcabeb8b12f/3e4f22a2f_CARGONEXv.png"
                  alt="CARGONEX"
                  className="h-12 object-contain mb-3"
                />
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">Fuvarköltség nyilatkozat</h1>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-0.5">Freight Cost Declaration</p>
              </div>
              <div className="text-right text-xs text-slate-500 space-y-1">
                {sheet.sheet_number && <p className="font-bold text-slate-700 text-sm">#{sheet.sheet_number}</p>}
                <p>Kelt: {today}</p>
                <p className="mt-2 font-semibold text-slate-600">{sheet.currency}</p>
              </div>
            </div>

            {/* ── META INFO GRID ────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-x-10 gap-y-3 mb-8 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-0.5">Fuvarozó / Carrier</p>
                <p className="font-bold text-slate-800">{sheet.carrier_name || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-0.5">Célország / Destination</p>
                <p className="font-bold text-slate-800">{destCountryName} ({sheet.destination_country})</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-0.5">Feladó / Origin</p>
                <p className="font-semibold text-slate-700">{sheet.supplier_name || "—"}</p>
                {sheet.supplier_site_name && <p className="text-slate-500">{sheet.supplier_site_name}</p>}
                {(sheet.origin_city || sheet.origin_address) && (
                  <p className="text-slate-500">{[sheet.origin_address, sheet.origin_city, sheet.origin_country].filter(Boolean).join(", ")}</p>
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-0.5">Érvényesség / Validity</p>
                <p className="font-semibold text-slate-700">
                  {sheet.valid_from} → {sheet.valid_until_revoked ? "visszavonásig" : (sheet.valid_to || "?")}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-0.5">Incoterms</p>
                <p className="font-semibold text-slate-700">{sheet.incoterms || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-0.5">Alap kiterhelés / Default Load</p>
                <p className="font-semibold text-slate-700">{sheet.default_load_tons} t</p>
              </div>
            </div>

            {/* ── TABLE ────────────────────────────────────────────── */}
            <h2 className="text-sm font-bold text-slate-700 mb-3 border-b border-slate-200 pb-1">
              Fuvardíj táblázat ({activeLines.length} lerakó)
            </h2>
            <table className="w-full border-collapse text-xs mb-8">
              <thead>
                <tr style={{ borderBottom: "2px solid #334155" }}>
                  {isHU && <th className="text-left py-2 pr-2 font-bold text-slate-700">Vármegye</th>}
                  <th className="text-left py-2 pr-2 font-bold text-slate-700">Város</th>
                  <th className="text-left py-2 pr-2 font-bold text-slate-700">ISZ</th>
                  <th className="text-right py-2 pr-2 font-bold text-slate-700">Belföld Határtól</th>
                  <th className="text-right py-2 pr-2 font-bold text-slate-700">Külföld Határig</th>
                  <th className="text-right py-2 pr-2 font-bold text-slate-700">Összesen</th>
                  <th className="text-right py-2 pr-2 font-bold text-slate-700">Kiterh. (t)</th>
                  <th className="text-right py-2 font-bold text-slate-700">EUR/to</th>
                </tr>
              </thead>
              <tbody>
                {activeLines.map((line, i) => {
                  const load = line.load_tons || sheet.default_load_tons || 24;
                  const total = (line.domestic_leg || 0) + (line.foreign_leg || 0);
                  const eurPerTon = load > 0 ? total / load : 0;
                  const fmt = (n) => n.toLocaleString("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  return (
                    <tr key={line.id || i} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 === 1 ? "#f8fafc" : "white" }}>
                      {isHU && <td className="py-1.5 pr-2 font-medium text-slate-700">{line.destination_county || "—"}</td>}
                      <td className="py-1.5 pr-2 text-slate-800">
                        {line.destination_city || "—"}
                        {line.destination_city?.toLowerCase().startsWith("budapest") && !line.destination_zip && (
                          <span className="text-slate-400 text-[10px] ml-1">(ZIP: n/a)</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-2 text-slate-500 font-mono">{line.destination_zip || (line.destination_city?.toLowerCase().startsWith("budapest") ? "–" : "—")}</td>
                      <td className="py-1.5 pr-2 text-right text-slate-700">{fmt(line.domestic_leg || 0)} {sheet.currency}</td>
                      <td className="py-1.5 pr-2 text-right text-slate-700">{fmt(line.foreign_leg || 0)} {sheet.currency}</td>

                      <td className="py-1.5 pr-2 text-right font-bold text-slate-900">{fmt(total)} {sheet.currency}</td>
                      <td className="py-1.5 pr-2 text-right text-slate-600">{load} t</td>
                      <td className="py-1.5 text-right font-semibold text-slate-800">{fmt(eurPerTon)} {sheet.currency}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* ── VALIDITY NOTE ─────────────────────────────────────── */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-10 text-xs text-slate-600">
              {validityText}
            </div>

            {/* ── SIGNATURE ────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-8 mt-6 pt-6 border-t border-slate-200 text-xs">
              <div>
                <p className="text-slate-400 mb-1">Kelt / Date</p>
                <div className="border-b border-slate-400 pb-1 min-h-[28px]">{today}</div>
              </div>
              <div>
                <p className="text-slate-400 mb-1">Helyszín / Place</p>
                <div className="border-b border-slate-400 pb-1 min-h-[28px]"></div>
              </div>
              <div>
                <p className="text-slate-400 mb-1">Aláírás / Signature</p>
                <div className="border-b border-slate-400 pb-1 min-h-[28px]"></div>
                <p className="text-slate-400 mt-1">Név / Cég:</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
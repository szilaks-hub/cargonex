import React from "react";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { getDeclarationText } from "./DeclarationText";

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

  const destCountryName = COUNTRY_NAMES[sheet.destination_country] || sheet.destination_country;

  const handlePrint = () => {
    const logoUrl = sheet.sheet_logo_url || "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_695955de68183bcabeb8b12f/3e4f22a2f_CARGONEXv.png";
    const fmt = (n) => Number(n || 0).toLocaleString("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const validityText = sheet.valid_until_revoked
      ? "Jelen nyilatkozat visszavonásig érvényes."
      : `Jelen nyilatkozat ${sheet.valid_from} – ${sheet.valid_to || "?"} között érvényes.`;

    const tableRows = activeLines.map((line, i) => {
      const load = line.load_tons || sheet.default_load_tons || 24;
      const total = (line.domestic_leg || 0) + (line.foreign_leg || 0);
      const eurPerTon = load > 0 ? total / load : 0;
      const bg = i % 2 === 1 ? "#f8fafc" : "#ffffff";
      const countyCell = isHU ? `<td style="padding:6px 8px 6px 0;border-bottom:1px solid #e2e8f0;background:${bg}">${line.destination_county || "—"}</td>` : "";
      return `<tr>
        ${countyCell}
        <td style="padding:6px 8px 6px 0;border-bottom:1px solid #e2e8f0;background:${bg}">${line.destination_city || "—"}</td>
        <td style="padding:6px 8px 6px 0;border-bottom:1px solid #e2e8f0;background:${bg};font-family:monospace">${line.destination_zip || "—"}</td>
        <td style="padding:6px 8px 6px 0;border-bottom:1px solid #e2e8f0;background:${bg};text-align:right">${fmt(line.domestic_leg)} ${sheet.currency}</td>
        <td style="padding:6px 8px 6px 0;border-bottom:1px solid #e2e8f0;background:${bg};text-align:right">${fmt(line.foreign_leg)} ${sheet.currency}</td>
        <td style="padding:6px 8px 6px 0;border-bottom:1px solid #e2e8f0;background:${bg};text-align:right;font-weight:700">${fmt(total)} ${sheet.currency}</td>
        <td style="padding:6px 8px 6px 0;border-bottom:1px solid #e2e8f0;background:${bg};text-align:right">${load} t</td>
        <td style="padding:6px 8px 6px 0;border-bottom:1px solid #e2e8f0;background:${bg};text-align:right;font-weight:600">${fmt(eurPerTon)} ${sheet.currency}</td>
      </tr>`;
    }).join("");

    const countyHeader = isHU ? `<th style="text-align:left;padding:7px 8px 7px 0;font-weight:700;border-bottom:2px solid #334155">Vármegye</th>` : "";

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Fuvarköltség nyilatkozat</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1e293b; background: white; }
    @media print { @page { margin: 15mm; } }
    @media screen { body { padding: 20mm; } }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e2e8f0">
    <div>
      <img src="${logoUrl}" alt="Logo" style="max-height:56px;object-fit:contain;margin-bottom:10px;display:block"/>
      <div style="font-size:20px;font-weight:700;color:#0f172a">Fuvarköltség nyilatkozat</div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-top:3px">Freight Cost Declaration</div>
    </div>
    <div style="text-align:right;font-size:12px;color:#64748b;line-height:1.7">
      ${sheet.sheet_number ? `<div style="font-weight:700;font-size:14px;color:#1e293b">#${sheet.sheet_number}</div>` : ""}
      <div>Kelt: ${today}</div>
      <div style="font-weight:600;color:#475569;margin-top:4px">${sheet.currency}</div>
    </div>
  </div>

  <!-- META GRID -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 48px;margin-bottom:24px">
    <div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;font-weight:700;margin-bottom:3px">Fuvarozó / Carrier</div>
      <div style="font-weight:700;color:#0f172a">${sheet.carrier_name || "—"}</div>
    </div>
    <div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;font-weight:700;margin-bottom:3px">Célország / Destination</div>
      <div style="font-weight:700;color:#0f172a">${destCountryName} (${sheet.destination_country})</div>
    </div>
    <div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;font-weight:700;margin-bottom:3px">Feladó / Origin</div>
      <div style="font-weight:700;color:#0f172a">${sheet.supplier_name || "—"}</div>
      ${sheet.supplier_site_name ? `<div style="color:#475569">${sheet.supplier_site_name}</div>` : ""}
      ${(sheet.origin_address || sheet.origin_city) ? `<div style="color:#475569">${[sheet.origin_address, sheet.origin_city, sheet.origin_country].filter(Boolean).join(", ")}</div>` : ""}
    </div>
    <div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;font-weight:700;margin-bottom:3px">Érvényesség / Validity</div>
      <div style="font-weight:700;color:#0f172a">${sheet.valid_from} → ${sheet.valid_until_revoked ? "visszavonásig" : (sheet.valid_to || "?")}</div>
    </div>
    <div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;font-weight:700;margin-bottom:3px">Incoterms</div>
      <div style="font-weight:700;color:#0f172a">${sheet.incoterms || "—"}</div>
    </div>
    <div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;font-weight:700;margin-bottom:3px">Alap kiterhelés / Default Load</div>
      <div style="font-weight:700;color:#0f172a">${sheet.default_load_tons} t</div>
    </div>
  </div>

  <!-- DECLARATION -->
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:28px;font-size:12px;line-height:1.6;color:#334155">
    ${getDeclarationText(sheet)}
  </div>

  <!-- TABLE HEADING -->
  <div style="font-size:14px;font-weight:700;color:#334155;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e2e8f0">
    Fuvardíj táblázat (${activeLines.length} lerakó)
  </div>

  <!-- TABLE -->
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:28px">
    <thead>
      <tr>
        ${countyHeader}
        <th style="text-align:left;padding:7px 8px 7px 0;font-weight:700;border-bottom:2px solid #334155">Város</th>
        <th style="text-align:left;padding:7px 8px 7px 0;font-weight:700;border-bottom:2px solid #334155">ISZ</th>
        <th style="text-align:right;padding:7px 8px 7px 0;font-weight:700;border-bottom:2px solid #334155">Belföld Határtól</th>
        <th style="text-align:right;padding:7px 8px 7px 0;font-weight:700;border-bottom:2px solid #334155">Külföld Határig</th>
        <th style="text-align:right;padding:7px 8px 7px 0;font-weight:700;border-bottom:2px solid #334155">Összesen</th>
        <th style="text-align:right;padding:7px 8px 7px 0;font-weight:700;border-bottom:2px solid #334155">Kiterh. (t)</th>
        <th style="text-align:right;padding:7px 8px 7px 0;font-weight:700;border-bottom:2px solid #334155">EUR/to</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>

  <!-- VALIDITY NOTE -->
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin-bottom:32px;font-size:12px;color:#475569">
    ${validityText}
  </div>

  <!-- SIGNATURE -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0 32px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:12px">
    <div>
      <div style="color:#94a3b8;margin-bottom:4px">Kelt / Date</div>
      <div style="border-bottom:1px solid #94a3b8;padding-bottom:4px;min-height:28px">${today}</div>
    </div>
    <div>
      <div style="color:#94a3b8;margin-bottom:4px">Helyszín / Place</div>
      <div style="border-bottom:1px solid #94a3b8;padding-bottom:4px;min-height:28px"></div>
    </div>
    <div>
      <div style="color:#94a3b8;margin-bottom:4px">Aláírás / Signature</div>
      <div style="border-bottom:1px solid #94a3b8;padding-bottom:4px;min-height:28px"></div>
      <div style="color:#94a3b8;margin-top:4px">Név / Cég:</div>
    </div>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=950,height=750");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-auto py-6">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4">

          {/* Controls */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Button onClick={handlePrint} className="gap-2" style={{ background: "linear-gradient(135deg,#1d4ed8,#1e40af)", color: "#fff" }}>
                <Printer className="w-4 h-4" /> Nyomtatás / PDF
              </Button>
              <span className="text-xs text-slate-400">A böngésző nyomtatási párbeszédpanelén válaszd: „Mentés PDF-ként"</span>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
          </div>

          {/* Document */}
          <div id="freight-print-doc" className="print-page p-10 text-[13px] text-slate-900 font-sans">

            {/* ── HEADER ───────────────────────────────────────────── */}
             <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-slate-200">
               <div>
                 <img
                   src={sheet.sheet_logo_url || "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_695955de68183bcabeb8b12f/3e4f22a2f_CARGONEXv.png"}
                   alt="Logo"
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

            {/* ── MANDATORY DECLARATION TEXT ────────────────────── */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-8 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
              {getDeclarationText(sheet)}
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
              {sheet.valid_until_revoked
                ? "Jelen nyilatkozat visszavonásig érvényes."
                : `Jelen nyilatkozat ${sheet.valid_from} – ${sheet.valid_to || "?"} között érvényes.`}
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

// Build the HTML for the print document content
function buildPrintHtml(sheet, activeLines, isHU, today, destCountryName, getDeclarationText) {
  // unused — content rendered via innerHTML of #freight-print-doc
}
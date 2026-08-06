import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertCircle, Clock, FileWarning, Printer } from "lucide-react";

export default function RevisionList() {
  const { data: trucks = [] } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => base44.entities.Truck.list("-created_date", 5000),
  });

  const [filter, setFilter] = useState("all"); // all | pending | done

  // Minden MRN-es kamion: van mrn_number VAGY mrn_number_2 VAGY amendment_requested
  const amendmentTrucks = trucks
    .filter((t) => t.mrn_number || t.mrn_number_2 || t.amendment_requested)
    .sort((a, b) => (b.mrn_date || b.loading_date || "").localeCompare(a.mrn_date || a.loading_date || ""));

  const pending = amendmentTrucks.filter((t) => !t.mrn_number_2);
  const done = amendmentTrucks.filter((t) => t.mrn_number_2);
  const flagged = amendmentTrucks.filter(
    (t) => (t.mrn_number && t.mrn_number.includes("!")) || (t.mrn_number_2 && t.mrn_number_2.includes("!"))
  );

  const shown =
    filter === "pending" ? pending
    : filter === "done" ? done
    : filter === "flagged" ? flagged
    : amendmentTrucks;

  const filterLabel =
    filter === "pending" ? "2. MRN várható"
    : filter === "done" ? "2. MRN megérkezett"
    : filter === "flagged" ? "! jelölt MRN"
    : "Összes";

  const handlePrint = () => {
    const now = new Date().toLocaleString("hu-HU");
    const rows = shown.map((t, i) => {
      const has2 = !!t.mrn_number_2;
      const mrn1Flag = t.mrn_number && t.mrn_number.includes("!");
      const mrn2Flag = has2 && t.mrn_number_2.includes("!");
      return `<tr>
        <td style="text-align:center">${i + 1}</td>
        <td style="white-space:nowrap;font-weight:700">${t.truck_number || "—"}</td>
        <td style="white-space:nowrap">${t.actual_loading_date || t.loading_date || "—"}</td>
        <td>${t.carrier_name || "—"}</td>
        <td>${t.supplier_name || "—"}</td>
        <td style="font-family:monospace;font-weight:600${mrn1Flag ? ";color:#dc2626;background:#fef2f2" : ""}">${t.mrn_number || "—"}</td>
        <td style="white-space:nowrap">${t.mrn_date || "—"}</td>
        <td style="white-space:nowrap">${t.amendment_requested_at ? new Date(t.amendment_requested_at).toLocaleDateString("hu-HU") : "—"}</td>
        <td style="font-family:monospace;font-weight:600${mrn2Flag ? ";color:#dc2626;background:#fef2f2" : has2 ? ";color:#16a34a" : ";color:#ccc"}">${t.mrn_number_2 || "—"}</td>
        <td style="white-space:nowrap;${has2 ? "color:#16a34a;font-weight:600" : "color:#ccc"}">${t.mrn_date_2 || "—"}</td>
        <td style="text-align:center">${has2 ? "✔ Megérkezett" : "⏳ Várható"}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="UTF-8">
<title>Revízió lista — ${filterLabel}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Inter', Arial, sans-serif; font-size: 11px; color: #0f172a; margin: 24px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .meta { font-size: 10px; color: #64748b; margin-bottom: 16px; }
  .summary { display: flex; gap: 12px; margin-bottom: 16px; }
  .summary-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
  .summary-card .label { font-size: 9px; color: #64748b; font-weight: 600; text-transform: uppercase; }
  .summary-card .value { font-size: 20px; font-weight: 800; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e293b; color: #fff; padding: 7px 8px; text-align: left; font-size: 9.5px; font-weight: 700; letter-spacing: 0.02em; }
  td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .footer { margin-top: 20px; font-size: 9px; color: #94a3b8; text-align: center; }
  @media print { body { margin: 12px; } .no-print { display: none; } }
</style>
</head>
<body>
  <h1>Revízió lista — ${filterLabel}</h1>
  <div class="meta">CARGONEX · ${now} · ${shown.length} db tétel</div>
  <div class="summary">
    <div class="summary-card"><div class="label">Összes</div><div class="value">${amendmentTrucks.length}</div></div>
    <div class="summary-card"><div class="label">Várható</div><div class="value">${pending.length}</div></div>
    <div class="summary-card"><div class="label">Megérkezett</div><div class="value">${done.length}</div></div>
    <div class="summary-card"><div class="label">! Jelölt</div><div class="value">${flagged.length}</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Rendszám</th>
        <th>Rakodás dátuma</th>
        <th>Fuvarozó</th>
        <th>Eladó</th>
        <th>1. MRN szám</th>
        <th>1. MRN dátum</th>
        <th>Kérelem dátuma</th>
        <th>2. MRN szám</th>
        <th>2. MRN dátum</th>
        <th style="text-align:center">Státusz</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="11" style="text-align:center;padding:24px;color:#94a3b8">Nincs megjeleníthető tétel</td></tr>'}
    </tbody>
  </table>
  <div class="footer">CARGONEX © 2026 — Revízió lista</div>
  <div class="no-print" style="margin-top:16px;text-align:center">
    <button onclick="window.print()" style="padding:8px 24px;font-size:12px;font-weight:600;background:#3B6CF4;color:#fff;border:none;border-radius:8px;cursor:pointer">Nyomtatás</button>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <FileWarning className="w-4 h-4 text-amber-600" />
            <div className="text-xs text-slate-500 font-semibold">Összes módosítási kérelem</div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{amendmentTrucks.length}</div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-600" />
            <div className="text-xs text-slate-500 font-semibold">2. MRN még várható</div>
          </div>
          <div className="text-2xl font-extrabold text-amber-700">{pending.length}</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-green-600" />
            <div className="text-xs text-slate-500 font-semibold">2. MRN megérkezett</div>
          </div>
          <div className="text-2xl font-extrabold text-green-700">{done.length}</div>
        </div>
      </div>

      {/* Filter buttons + print */}
      <div className="flex gap-2 items-center justify-between flex-wrap">
        <div className="flex gap-2">
          {[
            { key: "all", label: "Összes" },
            { key: "flagged", label: `! Jelölt (${flagged.length})` },
            { key: "pending", label: `Várható (${pending.length})` },
            { key: "done", label: `Megérkezett (${done.length})` },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                filter === f.key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors"
        >
          <Printer className="w-4 h-4" /> Nyomtatás
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="px-3 py-2.5 text-left font-semibold">#</th>
              <th className="px-3 py-2.5 text-left font-semibold">Rendszám</th>
              <th className="px-3 py-2.5 text-left font-semibold">Rakodás dátuma</th>
              <th className="px-3 py-2.5 text-left font-semibold">Fuvarozó</th>
              <th className="px-3 py-2.5 text-left font-semibold">Eladó</th>
              <th className="px-3 py-2.5 text-left font-semibold">1. MRN szám</th>
              <th className="px-3 py-2.5 text-left font-semibold">1. MRN dátum</th>
              <th className="px-3 py-2.5 text-left font-semibold">Kérelem dátuma</th>
              <th className="px-3 py-2.5 text-left font-semibold">2. MRN szám</th>
              <th className="px-3 py-2.5 text-left font-semibold">2. MRN dátum</th>
              <th className="px-3 py-2.5 text-center font-semibold">Státusz</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan="11" className="px-4 py-10 text-center text-slate-400">
                  Nincs megjeleníthető tétel
                </td>
              </tr>
            )}
            {shown.map((t, i) => {
              const has2 = !!t.mrn_number_2;
              return (
                <tr
                  key={t.id}
                  className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-amber-50/50 transition-colors`}
                >
                  <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2 font-bold text-slate-900 whitespace-nowrap">{t.truck_number || "—"}</td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{t.actual_loading_date || t.loading_date || "—"}</td>
                  <td className="px-3 py-2 text-slate-700 max-w-[10rem] truncate">{t.carrier_name || "—"}</td>
                  <td className="px-3 py-2 text-slate-700 max-w-[10rem] truncate">{t.supplier_name || "—"}</td>
                  <td className={`px-3 py-2 font-mono font-semibold whitespace-nowrap ${(t.mrn_number && t.mrn_number.includes("!")) ? "text-red-600 bg-red-50" : "text-slate-800"}`}>{t.mrn_number || "—"}</td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{t.mrn_date || "—"}</td>
                  <td className="px-3 py-2 text-amber-700 font-semibold whitespace-nowrap">
                    {t.amendment_requested_at ? new Date(t.amendment_requested_at).toLocaleDateString("hu-HU") : "—"}
                  </td>
                  <td className={`px-3 py-2 font-mono font-semibold whitespace-nowrap ${has2 ? (t.mrn_number_2.includes("!") ? "text-red-600 bg-red-50" : "text-green-700") : "text-slate-300"}`}>
                    {t.mrn_number_2 || "—"}
                  </td>
                  <td className={`px-3 py-2 whitespace-nowrap ${has2 ? "text-green-700 font-semibold" : "text-slate-300"}`}>
                    {t.mrn_date_2 || "—"}
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    {has2 ? (
                      <span className="inline-flex items-center gap-1 text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded-full">
                        ✔ Megérkezett
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 font-bold text-xs bg-amber-100 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3" /> Várható
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
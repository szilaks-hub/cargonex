import React, { useState, useRef } from "react";
import { CheckCircle, AlertTriangle, Minus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Printer, Shield, Upload, X } from "lucide-react";

export default function AEO() {
  const [activeSection, setActiveSection] = useState("audit");
  const [mrnFilter, setMrnFilter] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">AEO – Authorized Economic Operator</h1>
          <p className="text-sm text-slate-500">Nyilatkozatok és audit dokumentumok kezelése</p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        <button
          onClick={() => setActiveSection("audit")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
            activeSection === "audit"
              ? "border-blue-600 text-blue-700 bg-blue-50"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileText className="w-4 h-4" />
          Audit Jelentés
        </button>
        <button
          onClick={() => setActiveSection("mrn")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
            activeSection === "mrn"
              ? "border-blue-600 text-blue-700 bg-blue-50"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Shield className="w-4 h-4" />
          MRN – Számla kimutatás
        </button>
      </div>

      {activeSection === "audit" && <AuditJelentes />}
      {activeSection === "mrn" && <MrnSzamlaKimutatas />}
    </div>
  );
}

function AuditJelentes() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [logoUrl, setLogoUrl] = useState(null);
  const fileRef = useRef();
  const printRef = useRef();

  const { data: trucks = [] } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => base44.entities.Truck.list(),
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const today = new Date().toLocaleDateString("hu-HU");

  const filteredTrucks = trucks.filter((t) => {
    if (t.status === "cancelled") return false;
    const date = t.mrn_date || t.loading_date || t.actual_loading_date || "";
    if (fromDate && date < fromDate) return false;
    if (toDate && date > toDate) return false;
    return true;
  });

  // Find trucks with duplicate MRN
  const mrnCount = {};
  filteredTrucks.forEach(t => {
    if (t.mrn_number) mrnCount[t.mrn_number] = (mrnCount[t.mrn_number] || 0) + 1;
  });
  const duplicateMrnTrucks = filteredTrucks.filter(t => t.mrn_number && mrnCount[t.mrn_number] > 1);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  const CARGONEX_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6995745b061c5cfec8978279/7ed19bd16_image.png";

  const buildAuditRows = () => filteredTrucks.map((t, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${t.truck_number || "—"}</strong></td>
      <td>${t.loading_date || t.actual_loading_date || "—"}</td>
      <td>${t.product_name || "—"}</td>
      <td class="right">${(t.actual_weight_tons || t.planned_quantity_tons || 0).toFixed(2)}</td>
      <td>${t.supplier_invoice_number || "—"}</td>
      <td class="${mrnCount[t.mrn_number] > 1 ? "dup" : ""}">${t.mrn_number || "—"}${mrnCount[t.mrn_number] > 1 ? ' <span class="dup-badge">dupla</span>' : ""}</td>
      <td>${t.mrn_date || "—"}</td>
      <td class="right">${t.total_base ? Number(t.total_base).toLocaleString("hu-HU") : "—"}</td>
    </tr>
  `).join("");

  const buildDupRows = () => duplicateMrnTrucks.map((t, i) => `
    <tr>
      <td><strong>${t.truck_number || "—"}</strong></td>
      <td class="dup">${t.mrn_number}</td>
      <td>${t.mrn_date || "—"}</td>
      <td>${t.carrier_name || "—"}</td>
      <td class="right">${t.total_base ? Number(t.total_base).toLocaleString("hu-HU") : "—"}</td>
    </tr>
  `).join("");

  const totalTons = filteredTrucks.reduce((s, t) => s + (t.actual_weight_tons || t.planned_quantity_tons || 0), 0).toFixed(2);
  const totalHuf = filteredTrucks.reduce((s, t) => s + (t.total_base || 0), 0).toLocaleString("hu-HU");

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=960,height=1200");
    win.document.write(`<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8"/>
  <title>Auditjelentés</title>
  <style>
    @page { size: A4 portrait; margin: 14mm 16mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 10.5px; color: #0f172a; background: #fff; }

    /* ── PRINT TOOLBAR (screen only) ── */
    .toolbar { position: fixed; top: 0; left: 0; right: 0; background: #1e3a8a; color: white; padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; z-index: 999; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
    .toolbar span { font-size: 13px; font-weight: 700; }
    .toolbar button { background: white; color: #1e3a8a; border: none; padding: 7px 20px; border-radius: 5px; font-size: 12px; font-weight: 700; cursor: pointer; }
    .toolbar button:hover { background: #dbeafe; }
    @media print { .toolbar { display: none !important; } body { padding-top: 0 !important; } }

    body { padding-top: 52px; }

    /* ── PAGE WRAPPER ── */
    .page { max-width: 780px; margin: 24px auto; padding: 32px 36px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.07); }
    @media print { .page { max-width: 100%; margin: 0; padding: 0; border: none; box-shadow: none; border-radius: 0; } }

    /* ── HEADER ── */
    .doc-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e3a8a; padding-bottom: 18px; margin-bottom: 22px; }
    .doc-header-left h1 { font-size: 22px; font-weight: 900; color: #0f172a; margin-bottom: 10px; }
    .doc-meta-row { display: flex; gap: 6px; font-size: 9.5px; color: #475569; margin-bottom: 3px; }
    .doc-meta-row strong { color: #0f172a; min-width: 130px; display: inline-block; }
    .doc-logo { max-height: 80px; max-width: 180px; object-fit: contain; }

    /* ── BODY ── */
    .section { margin-bottom: 20px; }
    .salutation { font-size: 11px; font-weight: 600; margin-bottom: 14px; }
    p { line-height: 1.7; font-size: 10.5px; margin-bottom: 10px; }
    h2 { font-size: 12px; font-weight: 800; color: #1e3a8a; border-bottom: 1px solid #dbeafe; padding-bottom: 5px; margin: 20px 0 8px 0; }
    h3 { font-size: 10.5px; font-weight: 700; color: #334155; margin: 14px 0 5px 0; }
    ul.actions { list-style: none; margin: 6px 0 0 8px; }
    ul.actions li { padding: 4px 0; font-size: 10.5px; border-bottom: 1px solid #f1f5f9; }
    ul.actions li.selected { font-weight: 700; text-decoration: underline; }
    ul.actions li.dimmed { color: #94a3b8; }

    /* ── TABLES ── */
    table { border-collapse: collapse; width: 100%; font-size: 9px; margin-top: 8px; }
    th { background: #1e3a8a; color: white; padding: 5px 7px; font-size: 8.5px; font-weight: 700; text-align: left; white-space: nowrap; }
    td { border: 1px solid #e2e8f0; padding: 3.5px 7px; vertical-align: middle; }
    tr:nth-child(even) td { background: #f8fafc; }
    tfoot td { background: #1e3a8a; color: white; font-weight: bold; border-color: #1e3a8a; }
    .right { text-align: right; }
    .dup { color: #c2410c; font-weight: bold; }
    .dup-badge { background: #ffedd5; color: #c2410c; font-size: 7px; padding: 1px 4px; border-radius: 2px; margin-left: 4px; font-weight: 700; }

    /* ── SIGNATURE ── */
    .sig-block { margin-top: 40px; display: flex; justify-content: flex-end; }
    .sig-inner { text-align: center; }
    .sig-line { border-bottom: 1px solid #64748b; width: 220px; height: 28px; }
    .sig-name { font-size: 10px; font-weight: 700; margin-top: 4px; }
    .sig-date { font-size: 9px; color: #64748b; margin-top: 2px; }

    /* ── FOOTER ── */
    .doc-footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; font-size: 8px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="toolbar">
    <span>Auditjelentés – Nyomtatási nézet</span>
    <button onclick="window.print()">🖨️ Nyomtatás / PDF mentés</button>
  </div>

  <div class="page">
    <!-- FEJLÉC -->
    <div class="doc-header">
      <div class="doc-header-left">
        <h1>Auditjelentés</h1>
        <div class="doc-meta-row"><strong>Készült, Dabas:</strong> ${today}</div>
        <div class="doc-meta-row"><strong>Készítette:</strong> ${me?.full_name || me?.email || "—"}</div>
        <div class="doc-meta-row"><strong>Témakör:</strong> Számla-Vámkezelés ellenőrzés</div>
        <div class="doc-meta-row"><strong>Vizsgált időszak:</strong> ${periodText}</div>
      </div>
      <div>
        <img src="${logoUrl || CARGONEX_LOGO}" class="doc-logo" />
      </div>
    </div>

    <!-- MEGSZÓLÍTÁS -->
    <p class="salutation">Tisztelt Suhajda Krisztián ügyvezető Úr,</p>

    <!-- TÖRZS -->
    <div class="section">
      <p>Kérésének megfelelően vizsgálatot folytattam számlák és határozatok közti kapcsolatokon.
      Az auditot a beszerzési osztály bevonásával végeztem el. A vizsgálat tárgya és a vizsgált
      időszak: <strong>${periodText}</strong>. A vizsgált témakör alapadatait a vállalatirányítási rendszer,
      illetve manuálisan történt a teljes időszak egyenkénti átvizsgálása.</p>
    </div>

    <h2>Megállapítás:</h2>
    <div class="section">
      <p>A vizsgált időszakban nem tapasztaltunk eltéréseket.
      Ugyanis amit észrevettünk, rögtön kérvényeztük a felülvizsgálatát és a módosítását.
      Azon tételek, amelyek dupla MRN számmal rendelkeznek, mind ilyen tételek.</p>

      ${duplicateMrnTrucks.length > 0 ? `
      <h3>Dupla MRN számmal rendelkező tételek (${duplicateMrnTrucks.length} db):</h3>
      <table>
        <thead><tr>
          <th>Rendszám</th><th>MRN szám</th><th>MRN dátum</th><th>Fuvarozó</th><th class="right">Végösszeg (HUF)</th>
        </tr></thead>
        <tbody>${buildDupRows()}</tbody>
      </table>` : ""}
    </div>

    <h2>Javasolt intézkedés <span style="font-weight:400;font-size:10px;color:#64748b;">(megfelelő rész aláhúzandó):</span></h2>
    <ul class="actions">
      <li class="selected">– nem szükséges további intézkedés</li>
      <li class="dimmed">– visszaellenőrzés szükséges</li>
      <li class="dimmed">– hatósági bejelentés szükséges</li>
      <li class="dimmed">– belső szabályzat módosítása szükséges</li>
    </ul>

    ${filteredTrucks.length > 0 ? `
    <h2>Vizsgált időszak összesítője (${filteredTrucks.length} tétel):</h2>
    <table>
      <thead><tr>
        <th>#</th><th>Rendszám</th><th>Dátum</th><th>Termék</th>
        <th class="right">Tény. (t)</th><th>Eladó sz.sz.</th>
        <th>MRN szám</th><th>MRN dátum</th><th class="right">Végösszeg (HUF)</th>
      </tr></thead>
      <tbody>${buildAuditRows()}</tbody>
      <tfoot><tr>
        <td colspan="4">Összesen</td>
        <td class="right">${totalTons} t</td>
        <td colspan="3"></td>
        <td class="right">${totalHuf} HUF</td>
      </tr></tfoot>
    </table>` : ""}

    <!-- ALÁÍRÁS -->
    <div class="sig-block">
      <div class="sig-inner">
        <div class="sig-line"></div>
        <div class="sig-name">${me?.full_name || me?.email || "Készítő"}</div>
        <div class="sig-date">Dabas, ${today}</div>
      </div>
    </div>

    <div class="doc-footer">
      <span>AEO – Audit Nyilatkozat</span>
      <span>Dabas, ${today}</span>
    </div>
  </div>
</body>
</html>`);
    win.document.close();
    win.focus();
  };

  const periodText = fromDate || toDate
    ? `${fromDate ? fromDate : "—"} – ${toDate ? toDate : "—"}`
    : "Teljes időszak";

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm print:hidden">
        <h3 className="font-bold text-slate-700 mb-4">Audit Jelentés beállításai</h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Vizsgált időszak (-tól)</label>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-44" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Vizsgált időszak (-ig)</label>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-44" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Fejléc logó</label>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => fileRef.current.click()} className="gap-1.5">
                <Upload className="w-4 h-4" /> {logoUrl ? "Csere" : "Feltöltés"}
              </Button>
              {logoUrl && (
                <>
                  <img src={logoUrl} alt="logo" className="h-8 object-contain rounded border border-slate-200" />
                  <button onClick={() => setLogoUrl(null)} className="text-xs text-red-500 hover:underline">Törlés</button>
                </>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>
          </div>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 ml-auto">
            <Printer className="w-4 h-4" /> Nyomtatás / PDF
          </Button>
        </div>
      </div>

      {/* Audit document */}
      <div ref={printRef} id="audit-print" className="bg-white rounded-2xl border border-slate-200 shadow-md p-10 max-w-4xl mx-auto print:shadow-none print:border-none print:rounded-none print:p-8">

        {/* Letterhead */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #e2e8f0", paddingBottom: "24px", marginBottom: "24px" }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: "32px" }}>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Auditjelentés</h1>
            <div className="space-y-1 text-sm text-slate-700 mt-3">
              <div><span className="font-semibold w-32 inline-block">Készült, Dabas:</span> {today}</div>
              <div><span className="font-semibold w-32 inline-block">Készítette:</span> {me?.full_name || me?.email || "—"}</div>
              <div><span className="font-semibold w-32 inline-block">Témakör:</span> Számla-Vámkezelés ellenőrzés</div>
              <div><span className="font-semibold w-32 inline-block">Vizsgált időszak:</span> {periodText}</div>
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logó" style={{ maxHeight: "75px", maxWidth: "200px", objectFit: "contain", display: "block" }} />
            ) : (
              <div className="w-24 h-16 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center print:hidden">
                <span className="text-[10px] text-slate-400 text-center">Logó<br/>feltöltés</span>
              </div>
            )}
          </div>
        </div>

        {/* Salutation */}
        <p className="text-sm font-semibold text-slate-800 mb-6">Tisztelt Suhajda Krisztián ügyvezető Úr,</p>

        {/* Body */}
        <div className="space-y-4 text-sm text-slate-800 leading-relaxed">
          <p>
            Kérésének megfelelően vizsgálatot folytattam számlák és határozatok közti kapcsolatokon.
            Az auditot a beszerzési osztály bevonásával végeztem el. A vizsgálat tárgya és a vizsgált
            időszak: <strong>{periodText}</strong>. A vizsgált témakör alapadatait a vállalatirányítási rendszer,
            illetve manuálisan történt a teljes időszak egyenkénti átvizsgálása.
          </p>

          <div>
            <h2 className="text-base font-bold text-slate-900 mt-6 mb-2">Megállapítás:</h2>
            <p>
              A vizsgált időszakban nem tapasztaltunk eltéréseket.
              Ugyanis amit észrevettünk, rögtön kérvényeztük a felülvizsgálatát és a módosítását.
              Azon tételek, amelyek dupla MRN számmal rendelkeznek, mind ilyen tételek.
            </p>
          </div>

          {/* Duplicate MRN table */}
          {duplicateMrnTrucks.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-bold text-slate-700 mb-2">Dupla MRN számmal rendelkező tételek ({duplicateMrnTrucks.length} db):</h3>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="px-3 py-2 text-left font-semibold">Rendszám</th>
                    <th className="px-3 py-2 text-left font-semibold">MRN szám</th>
                    <th className="px-3 py-2 text-left font-semibold">MRN dátum</th>
                    <th className="px-3 py-2 text-left font-semibold">Fuvarozó</th>
                    <th className="px-3 py-2 text-right font-semibold">Végösszeg (HUF)</th>
                  </tr>
                </thead>
                <tbody>
                  {duplicateMrnTrucks.map((t, i) => (
                    <tr key={t.id} className={`border-b border-slate-200 ${i % 2 === 0 ? "bg-white" : "bg-amber-50"}`}>
                      <td className="px-3 py-2 font-bold text-slate-900">{t.truck_number || "—"}</td>
                      <td className="px-3 py-2 text-orange-700 font-semibold">{t.mrn_number}</td>
                      <td className="px-3 py-2 text-slate-600">{t.mrn_date || "—"}</td>
                      <td className="px-3 py-2 text-slate-600">{t.carrier_name || "—"}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">
                        {t.total_base ? Number(t.total_base).toLocaleString("hu-HU") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <h2 className="text-base font-bold text-slate-900 mt-6 mb-3">Javasolt intézkedés <span className="text-sm font-normal text-slate-500">(megfelelő rész aláhúzandó):</span></h2>
            <ul className="space-y-2 text-sm text-slate-800 ml-2">
              <li className="underline font-semibold">– nem szükséges további intézkedés</li>
              <li className="text-slate-400">– visszaellenőrzés szükséges</li>
              <li className="text-slate-400">– hatósági bejelentés szükséges</li>
              <li className="text-slate-400">– belső szabályzat módosítása szükséges</li>
            </ul>
          </div>

          {/* Full period table */}
          {filteredTrucks.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-bold text-slate-700 mb-2">Vizsgált időszak összesítője ({filteredTrucks.length} tétel):</h3>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="px-3 py-2 text-left font-semibold">#</th>
                    <th className="px-3 py-2 text-left font-semibold">Rendszám</th>
                    <th className="px-3 py-2 text-left font-semibold">Dátum</th>
                    <th className="px-3 py-2 text-left font-semibold">Termék</th>
                    <th className="px-3 py-2 text-right font-semibold">Tény. (t)</th>
                    <th className="px-3 py-2 text-left font-semibold">Eladó sz.sz.</th>
                    <th className="px-3 py-2 text-left font-semibold">MRN szám</th>
                    <th className="px-3 py-2 text-left font-semibold">MRN dátum</th>
                    <th className="px-3 py-2 text-right font-semibold">Végösszeg (HUF)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrucks.map((t, i) => (
                    <tr key={t.id} className={`border-b border-slate-200 ${i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                      <td className="px-3 py-1.5 text-slate-500">{i + 1}</td>
                      <td className="px-3 py-1.5 font-bold text-slate-900">{t.truck_number || "—"}</td>
                      <td className="px-3 py-1.5 text-slate-600">{t.loading_date || t.actual_loading_date || "—"}</td>
                      <td className="px-3 py-1.5 text-slate-700">{t.product_name || "—"}</td>
                      <td className="px-3 py-1.5 text-right font-semibold">{(t.actual_weight_tons || t.planned_quantity_tons || 0).toFixed(2)}</td>
                      <td className="px-3 py-1.5 text-slate-600">{t.supplier_invoice_number || "—"}</td>
                      <td className={`px-3 py-1.5 font-semibold ${mrnCount[t.mrn_number] > 1 ? "text-orange-600" : "text-slate-700"}`}>
                        {t.mrn_number || "—"}
                        {mrnCount[t.mrn_number] > 1 && <span className="ml-1 text-[10px] bg-orange-100 text-orange-700 px-1 rounded">dupla</span>}
                      </td>
                      <td className="px-3 py-1.5 text-slate-600">{t.mrn_date || "—"}</td>
                      <td className="px-3 py-1.5 text-right font-semibold">
                        {t.total_base ? Number(t.total_base).toLocaleString("hu-HU") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-800 text-white font-bold">
                    <td colSpan="4" className="px-3 py-2">Összesen</td>
                    <td className="px-3 py-2 text-right">
                      {filteredTrucks.reduce((s, t) => s + (t.actual_weight_tons || t.planned_quantity_tons || 0), 0).toFixed(2)} t
                    </td>
                    <td colSpan="3" className="px-3 py-2"></td>
                    <td className="px-3 py-2 text-right">
                      {filteredTrucks.reduce((s, t) => s + (t.total_base || 0), 0).toLocaleString("hu-HU")} HUF
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Signature */}
          <div className="mt-12 flex justify-end">
            <div className="text-center">
              <div className="border-b border-slate-400 w-48 mb-1"></div>
              <div className="text-xs text-slate-600 font-semibold">{me?.full_name || me?.email || "Készítő"}</div>
              <div className="text-xs text-slate-400">Dabas, {today}</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 15mm; margin-top: 8mm; }
          body * { visibility: hidden; }
          #audit-print, #audit-print * { visibility: visible; }
          #audit-print { position: fixed; inset: 0; padding: 15mm; font-size: 11px; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

function MrnSzamlaKimutatas() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterOrigin, setFilterOrigin] = useState("");
  const [filterDest, setFilterDest] = useState("");
  const [logoUrl, setLogoUrl] = useState(null);
  const fileRef = useRef();
  const printRef = useRef();

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  const { data: trucks = [] } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => base44.entities.Truck.list(),
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const today = new Date().toLocaleDateString("hu-HU");

  // All unique values for filter dropdowns
  const allCountries = [...new Set(trucks.map(t => t.destination_country).filter(Boolean))].sort();
  const allOrigins = [...new Set(trucks.map(t => t.supplier_site_name || t.origin_location_name).filter(Boolean))].sort();
  const allDests = [...new Set(trucks.map(t => t.destination_city).filter(Boolean))].sort();

  const relevant = trucks.filter(t => {
    const date = t.mrn_date || t.loading_date || t.actual_loading_date || "";
    if (fromDate && date < fromDate) return false;
    if (toDate && date > toDate) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterCountry && t.destination_country !== filterCountry) return false;
    if (filterOrigin && (t.supplier_site_name || t.origin_location_name) !== filterOrigin) return false;
    if (filterDest && t.destination_city !== filterDest) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !(t.mrn_number || "").toLowerCase().includes(s) &&
        !(t.supplier_invoice_number || "").toLowerCase().includes(s) &&
        !(t.freight_invoice_number || "").toLowerCase().includes(s) &&
        !(t.truck_number || "").toLowerCase().includes(s)
      ) return false;
    }
    return true;
  });

  const totalMrnDeclared = relevant.reduce((s, t) => s + (Number(t.mrn_declared_amount) || 0), 0);
  const totalVat = relevant.reduce((s, t) => s + (t.calculated_vat || (t.total_base * 0.27) || 0), 0);
  const totalBase = relevant.reduce((s, t) => s + (Number(t.total_base) || 0), 0);

  const fmt = (n) => (n !== null && n !== undefined && n !== "" && Number(n) !== 0) ? Number(n).toLocaleString("hu-HU") : "—";

  // Tájékoztató ÁFA: calculated_vat vagy total_base * 0.27 (mint a Finance oldalon)
  const getIndicVat = (t) => t.calculated_vat || (t.total_base * 0.27) || 0;

  // Egyezés: Tájékoztató ÁFA vs MRN megállapított (mint a Finance MrnStatistics)
  const getMatch = (t) => {
    const indicVat = getIndicVat(t);
    const mrn = Number(t.mrn_declared_amount);
    if (!mrn || !indicVat) return "missing";
    const diff = Math.abs(indicVat - mrn) / indicVat * 100;
    if (diff <= 0.5) return "match";
    if (diff <= 1) return "close";
    return "diff";
  };

  const CARGONEX_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6995745b061c5cfec8978279/7ed19bd16_image.png";

  const fmtN = (n) => (n && Number(n) !== 0) ? Number(n).toLocaleString("hu-HU") : "—";

  const buildMrnRows = () => relevant.map((t, i) => {
    const match = getMatch(t);
    const freightTotal = Number(t.freight_total_snapshot) || (Number(t.freight_domestic_leg_snapshot) || 0) + (Number(t.freight_foreign_leg_snapshot) || 0);
    const matchHtml = {
      match: '<span class="match">✔ Egyezik</span>',
      close: '<span class="close">≈ Közel</span>',
      diff: '<span class="diff">✗ Eltérés</span>',
      missing: '<span class="na">—</span>',
    }[match];
    return `<tr>
      <td>${i + 1}</td>
      <td><strong>${t.truck_number || "—"}</strong></td>
      <td>${t.actual_loading_date || t.loading_date || "—"}</td>
      <td>${t.carrier_name || "—"}</td>
      <td>${t.supplier_name || "—"}</td>
      <td>${t.supplier_invoice_number || "—"}</td>
      <td>${t.freight_invoice_number || "—"}</td>
      <td class="right">${(t.actual_weight_tons || t.planned_quantity_tons) ? Number(t.actual_weight_tons || t.planned_quantity_tons).toFixed(2) : "—"}</td>
      <td class="right">${fmtN(t.purchase_price)}</td>
      <td class="right">${freightTotal ? freightTotal.toLocaleString("hu-HU") : "—"}</td>
      <td>${t.mrn_number || "—"}</td>
      <td>${t.mrn_date || "—"}</td>
      <td class="right blue">${fmtN(t.mrn_declared_amount)}</td>
      <td class="right amber">${fmtN(getIndicVat(t))}</td>
      <td class="center">${matchHtml}</td>
    </tr>`;
  }).join("");

  const mrnTotalTons = relevant.reduce((s, t) => s + Number(t.actual_weight_tons || t.planned_quantity_tons || 0), 0).toFixed(2);
  const mrnTotalPurchase = fmtN(relevant.reduce((s, t) => s + (Number(t.purchase_price) || 0), 0));
  const mrnTotalFreight = relevant.reduce((s, t) => s + (Number(t.freight_total_snapshot) || (Number(t.freight_domestic_leg_snapshot) || 0) + (Number(t.freight_foreign_leg_snapshot) || 0)), 0).toLocaleString("hu-HU");

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=1280,height=1000");
    win.document.write(`<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8"/>
  <title>MRN – Számla kimutatás</title>
  <style>
    @page { size: A4 landscape; margin: 9mm 11mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 8px; color: #0f172a; background: #f8fafc; }

    /* ── PRINT TOOLBAR (screen only) ── */
    .toolbar { position: fixed; top: 0; left: 0; right: 0; background: #1e3a8a; color: white; padding: 9px 20px; display: flex; align-items: center; justify-content: space-between; z-index: 999; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
    .toolbar span { font-size: 13px; font-weight: 700; }
    .toolbar button { background: white; color: #1e3a8a; border: none; padding: 6px 18px; border-radius: 5px; font-size: 12px; font-weight: 700; cursor: pointer; }
    .toolbar button:hover { background: #dbeafe; }
    @media print { .toolbar { display: none !important; } body { padding-top: 0 !important; background: #fff; } }

    body { padding-top: 48px; }

    /* ── PAGE WRAPPER ── */
    .page { max-width: 1050px; margin: 18px auto; padding: 22px 26px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.07); }
    @media print { .page { max-width: 100%; margin: 0; padding: 0; border: none; box-shadow: none; border-radius: 0; } }

    /* ── HEADER ── */
    .doc-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 14px; }
    .doc-header-left h1 { font-size: 18px; font-weight: 900; color: #0f172a; margin-bottom: 6px; }
    .doc-meta-row { font-size: 8.5px; color: #475569; margin-bottom: 2px; }
    .doc-meta-row strong { color: #0f172a; min-width: 110px; display: inline-block; }
    .doc-logo { max-height: 65px; max-width: 160px; object-fit: contain; }

    /* ── KPI ── */
    .kpis { display: flex; gap: 8px; margin-bottom: 12px; }
    .kpi { border: 1px solid #e2e8f0; border-radius: 6px; padding: 7px 12px; flex: 1; background: #f8fafc; }
    .kpi-label { font-size: 6.5px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px; }
    .kpi-value { font-size: 13px; font-weight: 900; color: #0f172a; }
    .kpi-value.blue { color: #2563eb; }
    .kpi-value.amber { color: #d97706; }

    /* ── TABLE ── */
    table { border-collapse: collapse; width: 100%; font-size: 7px; }
    th { background: #1e3a8a; color: white; padding: 4px 5px; font-size: 6.5px; font-weight: 700; text-align: left; white-space: nowrap; }
    td { border: 1px solid #e8edf5; padding: 3px 5px; vertical-align: middle; }
    tr:nth-child(even) td { background: #f8fafc; }
    tfoot td { background: #1e3a8a; color: white; font-weight: bold; border-color: #1e3a8a; }
    .right { text-align: right; }
    .center { text-align: center; }
    .match { color: #16a34a; font-weight: bold; }
    .close { color: #d97706; font-weight: bold; }
    .diff { color: #dc2626; font-weight: bold; }
    .na { color: #94a3b8; }
    .blue { color: #2563eb; font-weight: bold; }
    .amber { color: #d97706; font-weight: bold; }

    /* ── FOOTER ── */
    .doc-footer { margin-top: 14px; border-top: 1px solid #e2e8f0; padding-top: 6px; display: flex; justify-content: space-between; font-size: 7px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="toolbar">
    <span>MRN – Számla kimutatás – Nyomtatási nézet</span>
    <button onclick="window.print()">🖨️ Nyomtatás / PDF mentés</button>
  </div>

  <div class="page">
    <!-- FEJLÉC -->
    <div class="doc-header">
      <div class="doc-header-left">
        <h1>MRN – Számla kimutatás</h1>
        <div class="doc-meta-row"><strong>Készült, Dabas:</strong> ${today}</div>
        <div class="doc-meta-row"><strong>Készítette:</strong> ${me?.full_name || me?.email || "—"}</div>
        <div class="doc-meta-row"><strong>Tételek száma:</strong> ${relevant.length} db</div>
      </div>
      <div>
        <img src="${logoUrl || CARGONEX_LOGO}" class="doc-logo" />
      </div>
    </div>

    <!-- KPI ÖSSZESÍTŐK -->
    <div class="kpis">
      <div class="kpi">
        <div class="kpi-label">Tételek száma</div>
        <div class="kpi-value">${relevant.length}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Végösszeg alap (HUF)</div>
        <div class="kpi-value">${fmtN(totalBase)}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">MRN megállapított (HUF)</div>
        <div class="kpi-value blue">${fmtN(totalMrnDeclared)}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Tájékoztató ÁFA (HUF)</div>
        <div class="kpi-value amber">${fmtN(totalVat)}</div>
      </div>
    </div>

    <!-- TÁBLÁZAT -->
    <table>
      <thead><tr>
        <th>#</th><th>Rendszám</th><th>Rakodás dátuma</th><th>Fuvarozó</th><th>Eladó</th>
        <th>Eladó sz.sz.</th><th>Fuvarszámla</th>
        <th class="right">Menny. (t)</th><th class="right">Áruvásl. (EUR)</th><th class="right">Fuvardíj (EUR)</th>
        <th>MRN szám</th><th>MRN dátum</th>
        <th class="right">MRN megáll. (HUF)</th><th class="right">Táj. ÁFA (HUF)</th>
        <th class="center">Egyezés</th>
      </tr></thead>
      <tbody>${buildMrnRows()}</tbody>
      <tfoot><tr>
        <td colspan="7">Összesen (${relevant.length} tétel)</td>
        <td class="right">${mrnTotalTons} t</td>
        <td class="right">${mrnTotalPurchase}</td>
        <td class="right">${mrnTotalFreight}</td>
        <td colspan="2"></td>
        <td class="right">${fmtN(totalMrnDeclared)}</td>
        <td class="right">${fmtN(totalVat)}</td>
        <td></td>
      </tr></tfoot>
    </table>

    <div class="doc-footer">
      <span>AEO – MRN Számla Nyilatkozat</span>
      <span>Dabas, ${today} &nbsp;|&nbsp; Készítette: ${me?.full_name || me?.email || "—"}</span>
    </div>
  </div>
</body>
</html>`);
    win.document.close();
    win.focus();
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-700">Szűrők</h3>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => fileRef.current.click()} className="gap-1.5">
              <Upload className="w-4 h-4" /> {logoUrl ? "Logó csere" : "Logó feltöltés"}
            </Button>
            {logoUrl && (
              <>
                <img src={logoUrl} alt="logo" className="h-7 object-contain rounded border border-slate-200" />
                <button onClick={() => setLogoUrl(null)} className="text-xs text-red-500 hover:underline">Törlés</button>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white gap-2" size="sm">
              <Printer className="w-4 h-4" /> Nyomtatás / PDF
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Dátum (-tól)</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Dátum (-ig)</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Státusz</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-full">
              <option value="">Minden</option>
              <option value="closed">Lezárt</option>
              <option value="finance_control">Pénzügyi ellenőrzés</option>
              <option value="loaded">Megrakott</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Rendszám / MRN</label>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Keresés..." className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Felrakó (origin)</label>
            <select value={filterOrigin} onChange={e => setFilterOrigin(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-full">
              <option value="">Minden</option>
              {allOrigins.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Lerakó (város)</label>
            <select value={filterDest} onChange={e => setFilterDest(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-full">
              <option value="">Minden</option>
              {allDests.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Ország</label>
            <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-full">
              <option value="">Minden</option>
              {allCountries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI cards */}
      <div id="mrn-print-area">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold mb-1">Tételek száma</div>
          <div className="text-2xl font-extrabold text-slate-900">{relevant.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold mb-1">MRN megállapított összeg (HUF)</div>
          <div className="text-lg font-extrabold text-blue-700">{fmt(totalMrnDeclared)}</div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold mb-1">Tájékoztató ÁFA (HUF)</div>
          <div className="text-lg font-extrabold text-amber-700">{fmt(totalVat)}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold mb-1">Végösszeg alap (HUF)</div>
          <div className="text-lg font-extrabold text-slate-900">{fmt(totalBase)}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="px-2 py-2.5 text-left font-semibold">#</th>
              <th className="px-2 py-2.5 text-left font-semibold">Rendszám</th>
              <th className="px-2 py-2.5 text-left font-semibold">Rakodás dátuma</th>
              <th className="px-2 py-2.5 text-left font-semibold">Fuvarozó</th>
              <th className="px-2 py-2.5 text-left font-semibold">Eladó</th>
              <th className="px-2 py-2.5 text-left font-semibold">Eladó sz.sz.</th>
              <th className="px-2 py-2.5 text-left font-semibold">Fuvarszámla</th>
              <th className="px-2 py-2.5 text-right font-semibold">Mennyiség (t)</th>
              <th className="px-2 py-2.5 text-right font-semibold">Áruvásárlás (EUR)</th>
              <th className="px-2 py-2.5 text-right font-semibold">Fuvardíj (EUR)</th>
              <th className="px-2 py-2.5 text-left font-semibold">MRN szám</th>
              <th className="px-2 py-2.5 text-left font-semibold">MRN dátum</th>
              <th className="px-2 py-2.5 text-right font-semibold">MRN megállapított (HUF)</th>
              <th className="px-2 py-2.5 text-right font-semibold">Táj. ÁFA (HUF)</th>
              <th className="px-2 py-2.5 text-center font-semibold">Egyezés</th>
            </tr>
          </thead>
          <tbody>
            {relevant.length === 0 && (
              <tr><td colSpan="15" className="px-4 py-8 text-center text-slate-400">Nincs megjeleníthető tétel</td></tr>
            )}
            {relevant.map((t, i) => {
              const match = getMatch(t);
              const freightTotal = Number(t.freight_total_snapshot) || (Number(t.freight_domestic_leg_snapshot) || 0) + (Number(t.freight_foreign_leg_snapshot) || 0);
              return (
                <tr key={t.id} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-blue-50 transition-colors`}>
                  <td className="px-2 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-2 py-2 font-bold text-slate-900 whitespace-nowrap">{t.truck_number || "—"}</td>
                  <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{t.actual_loading_date || t.loading_date || "—"}</td>
                  <td className="px-2 py-2 text-slate-700 max-w-[8rem] truncate">{t.carrier_name || "—"}</td>
                  <td className="px-2 py-2 text-slate-700 max-w-[8rem] truncate">{t.supplier_name || "—"}</td>
                  <td className="px-2 py-2 text-slate-700">{t.supplier_invoice_number || "—"}</td>
                  <td className="px-2 py-2 text-slate-700">{t.freight_invoice_number || "—"}</td>
                  <td className="px-2 py-2 text-right font-semibold text-slate-800">{(t.actual_weight_tons || t.planned_quantity_tons) ? Number(t.actual_weight_tons || t.planned_quantity_tons).toFixed(2) : "—"}</td>
                  <td className="px-2 py-2 text-right text-slate-700">{fmt(t.purchase_price)}</td>
                  <td className="px-2 py-2 text-right text-green-700 font-semibold">{freightTotal ? freightTotal.toLocaleString("hu-HU") : "—"}</td>
                  <td className="px-2 py-2 font-mono font-semibold text-slate-800 whitespace-nowrap">{t.mrn_number || "—"}</td>
                  <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{t.mrn_date || "—"}</td>
                  <td className="px-2 py-2 text-right font-bold text-blue-700">{fmt(t.mrn_declared_amount)}</td>
                  <td className="px-2 py-2 text-right font-bold text-indigo-700">{fmt(getIndicVat(t))}</td>
                  <td className="px-2 py-2 text-center whitespace-nowrap">
                    {match === "match" && <span className="inline-flex items-center gap-1 text-green-600 font-bold"><CheckCircle className="w-3.5 h-3.5" /> Egyezik</span>}
                    {match === "close" && <span className="inline-flex items-center gap-1 text-amber-600 font-semibold"><AlertTriangle className="w-3.5 h-3.5" /> Közel</span>}
                    {match === "diff" && <span className="inline-flex items-center gap-1 text-red-600 font-semibold"><AlertTriangle className="w-3.5 h-3.5" /> Eltérés</span>}
                    {match === "missing" && <span className="inline-flex items-center gap-1 text-slate-400"><Minus className="w-3.5 h-3.5" /> N/A</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {relevant.length > 0 && (
            <tfoot>
              <tr className="bg-slate-800 text-white font-bold">
                <td colSpan="7" className="px-2 py-2.5">Összesen ({relevant.length} tétel)</td>
                <td className="px-2 py-2.5 text-right">{relevant.reduce((s,t) => s + Number(t.actual_weight_tons || t.planned_quantity_tons || 0), 0).toFixed(2)} t</td>
                <td className="px-2 py-2.5 text-right">{fmt(relevant.reduce((s,t) => s + (Number(t.purchase_price)||0), 0))}</td>
                <td className="px-2 py-2.5 text-right">{relevant.reduce((s,t) => s + (Number(t.freight_total_snapshot)||(Number(t.freight_domestic_leg_snapshot)||0)+(Number(t.freight_foreign_leg_snapshot)||0)), 0).toLocaleString("hu-HU")}</td>
                <td colSpan="2" className="px-2 py-2.5"></td>
                <td className="px-2 py-2.5 text-right">{fmt(totalMrnDeclared)}</td>
                <td className="px-2 py-2.5 text-right">{fmt(totalVat)}</td>
                <td className="px-2 py-2.5"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      </div>{/* end mrn-print-area */}
    </div>
  );
}
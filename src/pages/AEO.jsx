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
    if (!["finance_control", "closed"].includes(t.status)) return false;
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

  const handlePrint = () => {
    const content = document.getElementById("audit-print");
    if (!content) return;
    const win = window.open("", "_blank", "width=900,height=1200");
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>Auditjelentés</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 0; }
          h1 { font-size: 22px; font-weight: 900; margin: 0 0 12px 0; }
          h2 { font-size: 14px; font-weight: 700; margin: 16px 0 6px 0; }
          h3 { font-size: 12px; font-weight: 700; margin: 12px 0 4px 0; }
          p { margin: 0 0 8px 0; line-height: 1.6; }
          ul { margin: 4px 0 8px 8px; padding: 0; list-style: none; }
          li { margin: 4px 0; }
          .audit-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 18px; margin-bottom: 20px; }
          .audit-header-left { flex: 1; min-width: 0; padding-right: 24px; }
          .audit-header-right { flex-shrink: 0; }
          .audit-logo { max-height: 75px; max-width: 200px; object-fit: contain; display: block; }
          table { border-collapse: collapse; width: 100%; font-size: 10px; margin-top: 8px; }
          th, td { border: 1px solid #cbd5e1; padding: 4px 6px; vertical-align: top; }
          thead tr { background: #1e293b; color: white; }
          tfoot tr { background: #1e293b; color: white; font-weight: bold; }
          .even { background: #f8fafc; } .odd { background: #ffffff; }
          .dup { color: #c2410c; font-weight: bold; }
          .dup-badge { background: #ffedd5; color: #c2410c; font-size: 8px; padding: 1px 3px; border-radius: 2px; margin-left: 3px; }
          .sig-block { margin-top: 48px; text-align: right; }
          .sig-line { border-bottom: 1px solid #94a3b8; width: 180px; display: inline-block; margin-bottom: 4px; }
          img.logo { max-height: 75px; max-width: 200px; object-fit: contain; }
          .print-hidden { display: none !important; }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
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
  const totalVat = relevant.reduce((s, t) => s + (Number(t.declared_vat) || 0), 0);
  const totalBase = relevant.reduce((s, t) => s + (Number(t.total_base) || 0), 0);

  const fmt = (n) => (n !== null && n !== undefined && n !== "" && Number(n) !== 0) ? Number(n).toLocaleString("hu-HU") : "—";

  // Only compare if BOTH fields are filled and non-zero
  const getMatch = (t) => {
    const declared = Number(t.mrn_declared_amount);
    const calculated = Number(t.total_base);
    if (!declared || !calculated) return "missing";
    const diff = Math.abs(declared - calculated);
    const pct = diff / Math.max(declared, calculated);
    if (pct < 0.001) return "match";   // <0.1% = egyezik
    if (pct < 0.05) return "close";    // <5% = közel
    return "diff";
  };

  const handlePrint = () => {
    const content = document.getElementById("mrn-print-area");
    if (!content) return;
    const win = window.open("", "_blank", "width=1100,height=1400");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>MRN – Számla kimutatás</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      body { font-family: Arial, sans-serif; font-size: 9.5px; color: #0f172a; margin: 0; padding: 0; }
      .header { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #1e293b; padding-bottom:10px; margin-bottom:14px; }
      .header h1 { font-size:18px; font-weight:900; margin:0 0 4px 0; }
      .header p { margin:0; font-size:10px; color:#475569; }
      table { border-collapse:collapse; width:100%; }
      th { background:#1e293b; color:white; padding:5px 7px; font-size:8.5px; font-weight:700; text-align:left; }
      td { border:1px solid #cbd5e1; padding:4px 6px; vertical-align:top; }
      tr:nth-child(even) td { background:#f8fafc; }
      tfoot td { background:#1e293b; color:white; font-weight:bold; }
      .match { color:#16a34a; font-weight:bold; }
      .close { color:#d97706; font-weight:bold; }
      .diff { color:#dc2626; font-weight:bold; }
      .na { color:#94a3b8; }
      .kpis { display:flex; gap:16px; margin-bottom:14px; }
      .kpi { border:1px solid #e2e8f0; border-radius:6px; padding:8px 14px; flex:1; }
      .kpi-label { font-size:8px; color:#64748b; font-weight:600; text-transform:uppercase; margin-bottom:2px; }
      .kpi-value { font-size:14px; font-weight:900; color:#1e293b; }
    </style></head><body>${content.innerHTML}</body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-700">Szűrők</h3>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white gap-2" size="sm">
            <Printer className="w-4 h-4" /> Nyomtatás / PDF
          </Button>
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
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold mb-1">Tájékoztató ÁFA (HUF)</div>
          <div className="text-lg font-extrabold text-indigo-700">{fmt(totalVat)}</div>
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
              <th className="px-3 py-2.5 text-left font-semibold">#</th>
              <th className="px-3 py-2.5 text-left font-semibold">Rendszám</th>
              <th className="px-3 py-2.5 text-left font-semibold">Dátum</th>
              <th className="px-3 py-2.5 text-left font-semibold">MRN szám</th>
              <th className="px-3 py-2.5 text-left font-semibold">MRN dátum</th>
              <th className="px-3 py-2.5 text-left font-semibold">Eladó számla</th>
              <th className="px-3 py-2.5 text-left font-semibold">Fuvarszámla</th>
              <th className="px-3 py-2.5 text-right font-semibold">Végösszeg alap (HUF)</th>
              <th className="px-3 py-2.5 text-right font-semibold">MRN megállapított (HUF)</th>
              <th className="px-3 py-2.5 text-right font-semibold">Táj. ÁFA (HUF)</th>
              <th className="px-3 py-2.5 text-center font-semibold">Egyezés</th>
            </tr>
          </thead>
          <tbody>
            {relevant.length === 0 && (
              <tr><td colSpan="11" className="px-4 py-8 text-center text-slate-400">Nincs megjeleníthető tétel</td></tr>
            )}
            {relevant.map((t, i) => {
              const match = getMatch(t);
              return (
                <tr key={t.id} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-blue-50 transition-colors`}>
                  <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2 font-bold text-slate-900">{t.truck_number || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{t.loading_date || t.actual_loading_date || "—"}</td>
                  <td className="px-3 py-2 font-mono font-semibold text-slate-800">{t.mrn_number || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{t.mrn_date || "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{t.supplier_invoice_number || "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{t.freight_invoice_number || "—"}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmt(t.total_base)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-blue-700">{fmt(t.mrn_declared_amount)}</td>
                  <td className="px-3 py-2 text-right text-indigo-700">{fmt(t.declared_vat)}</td>
                  <td className="px-3 py-2 text-center">
                    {match === "match" && <span className="inline-flex items-center gap-1 text-green-600 font-semibold"><CheckCircle className="w-3.5 h-3.5" /> Egyezik</span>}
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
                <td colSpan="7" className="px-3 py-2.5">Összesen ({relevant.length} tétel)</td>
                <td className="px-3 py-2.5 text-right">{fmt(totalBase)}</td>
                <td className="px-3 py-2.5 text-right">{fmt(totalMrnDeclared)}</td>
                <td className="px-3 py-2.5 text-right">{fmt(totalVat)}</td>
                <td className="px-3 py-2.5"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      </div>{/* end mrn-print-area */}
    </div>
  );
}
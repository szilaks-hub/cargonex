import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Download, Trash2, AlertTriangle, ShieldAlert, CheckCircle2, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

const RESET_ENTITIES = [
  { key: "Truck", label: "Fuvarok (Logistics)" },
  { key: "Orderbook", label: "Rendelések (Orderbooks)" },
  { key: "OrderbookLine", label: "Rendelés sorok" },
  { key: "PurchaseOrder", label: "Vásárlási rendelések" },
  { key: "PurchaseOrderLine", label: "Vásárlási rendelés sorok" },
  { key: "OrderLine", label: "Rendelési sorok (legacy)" },
  { key: "AuditLog", label: "Audit napló" },
];

const EXPORT_ENTITIES = [
  "Truck", "Orderbook", "OrderbookLine",
  "Partner", "PartnerLocation",
  "FreightSheet", "FreightSheetLine", "FreightRate",
  "Product", "ProductCategory",
  "PurchaseOrder", "PurchaseOrderLine", "OrderLine",
  "AuditLog",
];

export default function MasterPanel() {
  const [resetStep, setResetStep] = useState("idle"); // idle | confirm | running | done
  const [confirmText, setConfirmText] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [resetLog, setResetLog] = useState([]);
  const [importStep, setImportStep] = useState("idle"); // idle | preview | running | done
  const [importData, setImportData] = useState(null);
  const [importLog, setImportLog] = useState([]);
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const result = {};
      for (const ent of EXPORT_ENTITIES) {
        try {
          result[ent] = await base44.entities[ent].list();
        } catch {
          result[ent] = [];
        }
      }
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cargonex_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        setImportData(data);
        setImportStep("preview");
      } catch {
        alert("Érvénytelen JSON fájl!");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImport = async () => {
    setImportStep("running");
    const log = [];
    for (const [entityName, records] of Object.entries(importData)) {
      if (!Array.isArray(records) || records.length === 0) continue;
      if (!base44.entities[entityName]) {
        log.push({ label: entityName, count: 0, ok: false, error: "Ismeretlen entitás" });
        continue;
      }
      let created = 0;
      let failed = 0;
      for (const record of records) {
        try {
          const { id, created_date, updated_date, created_by, ...data } = record;
          await base44.entities[entityName].create(data);
          created++;
        } catch {
          failed++;
        }
      }
      log.push({ label: entityName, count: created, failed, ok: failed === 0 });
    }
    setImportLog(log);
    setImportStep("done");
  };

  const handleReset = async () => {
    setResetStep("running");
    const log = [];
    for (const { key, label } of RESET_ENTITIES) {
      try {
        const records = await base44.entities[key].list();
        let deleted = 0;
        for (const r of records) {
          await base44.entities[key].delete(r.id);
          deleted++;
        }
        log.push({ label, count: deleted, ok: true });
      } catch (e) {
        log.push({ label, error: e.message, ok: false });
      }
    }
    setResetLog(log);
    setResetStep("done");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Master Panel</h1>
        <p className="text-sm text-slate-500 mt-1">Rendszerszintű adatkezelési műveletek</p>
      </div>

      {/* Export */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-slate-800">Adatok exportálása</h2>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              Az összes adat letöltése JSON formátumban (biztonsági mentés).
              Tartalmaz: fuvarokat, rendeléseket, partnereket, termékeket, díjlapokat.
            </p>
            <Button onClick={handleExport} disabled={exportLoading} className="gap-2">
              {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exportLoading ? "Exportálás..." : "Adatok letöltése (JSON)"}
            </Button>
          </div>
        </div>
      </div>

      {/* Import */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
            <Upload className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-slate-800">Adatok visszatöltése</h2>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              Egy korábban exportált JSON mentés visszatöltése. Az adatok a meglévők mellé kerülnek (nem felülírja).
            </p>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />

            {importStep === "idle" && (
              <Button onClick={() => fileInputRef.current?.click()} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                <Upload className="w-4 h-4" /> JSON fájl kiválasztása
              </Button>
            )}

            {importStep === "preview" && importData && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-700">A fájlban található adatok:</p>
                <div className="space-y-1">
                  {Object.entries(importData).filter(([, v]) => Array.isArray(v) && v.length > 0).map(([k, v]) => (
                    <div key={k} className="text-xs flex justify-between px-3 py-1.5 rounded bg-slate-50 text-slate-600">
                      <span>{k}</span>
                      <span className="font-semibold">{v.length} rekord</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleImport} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                    <Upload className="w-4 h-4" /> Importálás indítása
                  </Button>
                  <Button variant="outline" onClick={() => { setImportStep("idle"); setImportData(null); }}>
                    Mégse
                  </Button>
                </div>
              </div>
            )}

            {importStep === "running" && (
              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Importálás folyamatban...
              </div>
            )}

            {importStep === "done" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Importálás kész
                </div>
                <div className="space-y-1">
                  {importLog.map((l, i) => (
                    <div key={i} className={`text-xs flex justify-between px-3 py-1.5 rounded ${l.ok ? "bg-slate-50 text-slate-600" : "bg-amber-50 text-amber-700"}`}>
                      <span>{l.label}</span>
                      <span className="font-semibold">{l.count} létrehozva{l.failed ? `, ${l.failed} hiba` : ""}</span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={() => { setImportStep("idle"); setImportData(null); setImportLog([]); }}>
                  Bezárás
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Master Reset */}
      <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-red-700">Master Reset</h2>
            <p className="text-sm text-slate-500 mt-1 mb-3">
              <span className="font-semibold text-slate-700">Törlésre kerül:</span> minden fuvar, rendelés (Orderbook + sorok), pénzügy/vám adat és audit napló.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-amber-700 text-sm font-semibold mb-1">
                <AlertTriangle className="w-4 h-4" /> Nem törlődik:
              </div>
              <ul className="text-xs text-amber-700 list-disc ml-5 space-y-0.5">
                <li>Termékek & Termékkategóriák</li>
                <li>Partnerek & Partner telephelyek</li>
                <li>Díjlapok & Díjlap sorok & Fuvarozási díjak</li>
              </ul>
            </div>

            {resetStep === "idle" && (
              <Button variant="destructive" className="gap-2" onClick={() => setResetStep("confirm")}>
                <Trash2 className="w-4 h-4" /> Master Reset indítása
              </Button>
            )}

            {resetStep === "confirm" && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-red-700">
                  A megerősítéshez írd be: <span className="font-mono bg-red-50 px-1 rounded">RESET</span>
                </p>
                <input
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="RESET"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    disabled={confirmText !== "RESET"}
                    onClick={handleReset}
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Törlés végrehajtása
                  </Button>
                  <Button variant="outline" onClick={() => { setResetStep("idle"); setConfirmText(""); }}>
                    Mégse
                  </Button>
                </div>
              </div>
            )}

            {resetStep === "running" && (
              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Törlés folyamatban...
              </div>
            )}

            {resetStep === "done" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Reset sikeresen elvégezve
                </div>
                <div className="space-y-1">
                  {resetLog.map((l, i) => (
                    <div key={i} className={`text-xs flex justify-between px-3 py-1.5 rounded ${l.ok ? "bg-slate-50 text-slate-600" : "bg-red-50 text-red-600"}`}>
                      <span>{l.label}</span>
                      <span className="font-semibold">{l.ok ? `${l.count} rekord törölve` : `Hiba: ${l.error}`}</span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={() => { setResetStep("idle"); setConfirmText(""); setResetLog([]); }}>
                  Bezárás
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
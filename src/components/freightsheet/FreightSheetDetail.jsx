import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Edit2, GitBranch, Copy, CheckCircle2, Archive, AlertCircle } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import FreightSheetLineEditor from "./FreightSheetLineEditor";
import FreightSheetPrint from "./FreightSheetPrint";
import FreightSheetForm from "./FreightSheetForm";
import CopyLinesModal from "./CopyLinesModal";

export default function FreightSheetDetail({ sheet, onBack, onUpdated, user }) {
  const qc = useQueryClient();
  const [showPrint, setShowPrint] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showNewVersion, setShowNewVersion] = useState(false);
  const [showCopyLines, setShowCopyLines] = useState(false);
  const [activating, setActivating] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [currentSheet, setCurrentSheet] = useState(sheet);
  const [activateError, setActivateError] = useState("");

  const isAdmin = user?.role === "admin";

  const { data: lines = [] } = useQuery({
    queryKey: ["sheetLines", currentSheet.id],
    queryFn: () => base44.entities.FreightSheetLine.filter({ sheet_id: currentSheet.id }, "sort_order"),
  });

  const activeCount = lines.filter(l => l.is_active !== false).length;
  const isDraft = currentSheet.status === "draft";
  const isActive = currentSheet.status === "active";
  const isArchived = currentSheet.status === "archived";

  // Activation pre-checks
  const activationChecks = [
    { ok: !!currentSheet.carrier_id, label: "Fuvarozó megadva" },
    { ok: !!currentSheet.origin_city, label: "Rakodóhely fixálva" },
    { ok: !!currentSheet.destination_country, label: "Célország megadva" },
    { ok: !!currentSheet.valid_from, label: "Érvényesség kezdete megadva" },
    { ok: activeCount > 0, label: `Legalább 1 aktív sor (jelenleg: ${activeCount})` },
    { ok: lines.length === 0 || lines.every(l => (Number(l.domestic_leg) || 0) + (Number(l.foreign_leg) || 0) > 0), label: "Minden sor ára kitöltve" },
  ];
  const canActivate = activationChecks.every(c => c.ok);

  const handleActivate = async () => {
    if (!canActivate) {
      setActivateError("Nem teljesülnek az aktiválási feltételek.");
      return;
    }
    setActivating(true);
    setActivateError("");
    const updated = await base44.entities.FreightSheet.update(currentSheet.id, { status: "active" });
    setCurrentSheet(prev => ({ ...prev, status: "active" }));
    qc.invalidateQueries({ queryKey: ["freightSheets"] });
    setActivating(false);
  };

  const handleArchive = async () => {
    setArchiving(true);
    const newStatus = isArchived ? "draft" : "archived";
    await base44.entities.FreightSheet.update(currentSheet.id, { status: newStatus });
    setCurrentSheet(prev => ({ ...prev, status: newStatus }));
    qc.invalidateQueries({ queryKey: ["freightSheets"] });
    setArchiving(false);
  };

  // Create new version: archive old → create new draft with same data
  const handleNewVersion = async () => {
    await base44.entities.FreightSheet.update(currentSheet.id, { status: "archived" });
    const newLines = lines.map(({ id, created_date, updated_date, created_by, sheet_id, ...rest }) => rest);
    const allSheets = await base44.entities.FreightSheet.list("-created_date", 1);
    const newest = allSheets[0];
    if (newest && newLines.length > 0) {
      await base44.entities.FreightSheetLine.bulkCreate(newLines.map(l => ({ ...l, sheet_id: newest.id })));
    }
    qc.invalidateQueries({ queryKey: ["freightSheets"] });
    qc.invalidateQueries({ queryKey: ["sheetLines"] });
    onUpdated();
  };

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
                {currentSheet.carrier_name} → {currentSheet.destination_country}
              </h2>
              <StatusBadge status={currentSheet.status} />
              {currentSheet.sheet_number && (
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">{currentSheet.sheet_number}</span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentSheet.supplier_name && <span>{currentSheet.supplier_name} · </span>}
              {currentSheet.origin_city && <span>{currentSheet.origin_city} → </span>}
              {currentSheet.valid_from} {currentSheet.valid_until_revoked ? "→ visszavonásig" : `→ ${currentSheet.valid_to || "?"}`}
              {currentSheet.incoterms && <span> · {currentSheet.incoterms}</span>}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
           {/* Draft: Edit + Activate */}
           {isDraft && (
             <>
               <Button variant="outline" onClick={() => setShowEdit(true)} className="gap-2 border-[#c6ccda] text-slate-600">
                 <Edit2 className="w-3.5 h-3.5" /> Szerkesztés
               </Button>
               {isAdmin && (
                 <Button
                   onClick={handleActivate}
                   disabled={activating || !canActivate}
                   title={!canActivate ? "Nem teljesülnek az aktiválási feltételek" : "Aktiválás"}
                   className="gap-2 text-white"
                   style={{ background: canActivate ? "linear-gradient(135deg,#16a34a,#15803d)" : undefined }}
                   variant={canActivate ? "default" : "outline"}
                 >
                   <CheckCircle2 className="w-3.5 h-3.5" /> {activating ? "Aktiválás..." : "Aktiválás"}
                 </Button>
               )}
             </>
           )}
           {/* Active: Edit + New version + Archive */}
           {isActive && (
             <>
               <Button variant="outline" onClick={() => setShowEdit(true)} className="gap-2 border-[#c6ccda] text-slate-600">
                 <Edit2 className="w-3.5 h-3.5" /> Szerkesztés
               </Button>
               {isAdmin && (
                 <>
                   <Button variant="outline" onClick={() => setShowNewVersion(true)} className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50">
                     <GitBranch className="w-3.5 h-3.5" /> Új verzió
                   </Button>
                   <Button variant="outline" onClick={handleArchive} disabled={archiving} className="gap-2 border-slate-300 text-slate-500 hover:bg-slate-50">
                     <Archive className="w-3.5 h-3.5" /> {archiving ? "..." : "Archiválás"}
                   </Button>
                 </>
               )}
             </>
           )}
           {/* Archived: Restore */}
           {isArchived && isAdmin && (
             <Button variant="outline" onClick={handleArchive} disabled={archiving} className="gap-2 border-blue-300 text-blue-600 hover:bg-blue-50">
               <Archive className="w-3.5 h-3.5" /> {archiving ? "..." : "Visszaállítás (Draft)"}
             </Button>
           )}
          <Button variant="outline" onClick={() => setShowCopyLines(true)} className="gap-2 border-[#c6ccda] text-slate-600">
            <Copy className="w-3.5 h-3.5" /> Sorok másolása
          </Button>
          <Button onClick={() => setShowPrint(true)} className="gap-2 text-white" style={{ background: "linear-gradient(135deg,#e05a2b,#c0392b)" }}>
            <Printer className="w-4 h-4" /> Nyomtatás
          </Button>
        </div>
      </div>

      {/* Activation error or pre-check hints */}
      {isDraft && !canActivate && (
        <div className="rounded-lg px-4 py-2.5 text-xs bg-amber-50 border border-amber-200 text-amber-800 space-y-1">
          <div className="font-semibold flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Aktiválási feltételek:</div>
          {activationChecks.map((c, i) => (
            <div key={i} className={`flex items-center gap-1.5 ${c.ok ? "text-green-700" : "text-red-600"}`}>
              <span>{c.ok ? "✓" : "✗"}</span> {c.label}
            </div>
          ))}
        </div>
      )}
      {activateError && (
        <div className="rounded-lg px-4 py-2.5 text-xs bg-red-50 border border-red-200 text-red-700">{activateError}</div>
      )}

      {/* Status notice for non-draft */}
      {!isDraft && (
        <div className={`rounded-lg px-4 py-2.5 text-xs flex items-center gap-2 ${
          isActive
            ? "bg-green-50 border border-green-200 text-green-700"
            : "bg-slate-50 border border-slate-200 text-slate-500"
        }`}>
          {isActive
            ? "✅ Aktív lap: közvetlen szerkesztés nem lehetséges. Módosításhoz hozz létre Új verziót (régi lap automatikusan archiválódik)."
            : "📦 Archivált lap – csak olvasható. Admin visszaállíthatja Draft státuszba."}
        </div>
      )}

      {/* Summary bar */}
      <div className="cx-glass px-5 py-3 flex gap-6 flex-wrap text-sm">
        <div><span className="text-slate-400 text-xs">Alap kiterh.</span><div className="font-semibold text-slate-700">{currentSheet.default_load_tons} t</div></div>
        <div><span className="text-slate-400 text-xs">Deviza</span><div className="font-semibold text-slate-700">{currentSheet.currency}</div></div>
        <div><span className="text-slate-400 text-xs">Aktív sorok</span><div className="font-semibold text-slate-700">{activeCount} / {lines.length}</div></div>
        <div><span className="text-slate-400 text-xs">Incoterms</span><div className="font-semibold text-slate-700">{currentSheet.incoterms || "-"}</div></div>
        {currentSheet.origin_city && <div><span className="text-slate-400 text-xs">Rakodás</span><div className="font-semibold text-slate-700">{currentSheet.origin_city}</div></div>}
        {currentSheet.notes && <div><span className="text-slate-400 text-xs">Megjegyzés</span><div className="font-semibold text-slate-700">{currentSheet.notes}</div></div>}
      </div>

      {/* Edit form (draft only) */}
      {showEdit && (
        <FreightSheetForm
          item={currentSheet}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); onUpdated(); }}
        />
      )}

      {/* New version form (for active sheets) */}
      {showNewVersion && (
        <FreightSheetForm
          item={currentSheet}
          forceDraft={true}
          onClose={() => setShowNewVersion(false)}
          onSaved={() => { setShowNewVersion(false); handleNewVersion(); }}
        />
      )}

      {/* Line editor — readonly if archived */}
      <div className="cx-table-wrap">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Fuvar sorok / Freight Lines</h3>
          <span className="text-xs text-slate-400">
            {isDraft
              ? "Soronként mentés a 💾 ikonnal · Új sor az utolsó kék sorban"
              : "Szerkesztéshez hozz létre Új verziót"}
          </span>
        </div>
        <FreightSheetLineEditor sheet={currentSheet} readonly={!isDraft} />
      </div>

      {/* Copy lines modal */}
      {showCopyLines && (
        <CopyLinesModal
          currentSheetId={currentSheet.id}
          onClose={() => setShowCopyLines(false)}
          onCopied={() => {
            setShowCopyLines(false);
            qc.invalidateQueries({ queryKey: ["sheetLines", currentSheet.id] });
          }}
        />
      )}

      {/* Print modal */}
      {showPrint && (
        <FreightSheetPrint sheet={currentSheet} lines={lines} onClose={() => setShowPrint(false)} />
      )}
    </div>
  );
}
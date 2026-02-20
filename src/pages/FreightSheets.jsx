import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import FreightSheetForm from "@/components/freightsheet/FreightSheetForm";
import FreightSheetDetail from "@/components/freightsheet/FreightSheetDetail";
import FreightSheetAnalysis from "@/components/freightsheet/FreightSheetAnalysis";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Copy, Archive, CheckCircle2, Eye, BarChart2 } from "lucide-react";

export default function FreightSheets() {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [filterCountry, setFilterCountry] = useState("");
  const [user, setUser] = useState(null);
  const qc = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => {});
  }, []);

  const isAdmin = user?.role === "admin";

  const { data: sheets = [], isLoading } = useQuery({
    queryKey: ["freightSheets"],
    queryFn: () => base44.entities.FreightSheet.list("-valid_from"),
  });

  // Line counts per sheet
  const { data: allLines = [] } = useQuery({
    queryKey: ["allFreightLines"],
    queryFn: () => base44.entities.FreightSheetLine.list(),
  });
  const lineCounts = allLines.reduce((acc, l) => {
    acc[l.sheet_id] = (acc[l.sheet_id] || 0) + 1;
    return acc;
  }, {});

  const handleArchive = async (r) => {
    const newStatus = r.status === "archived" ? "draft" : "archived";
    await base44.entities.FreightSheet.update(r.id, { status: newStatus });
    qc.invalidateQueries({ queryKey: ["freightSheets"] });
  };

  const handleActivate = async (r) => {
    await base44.entities.FreightSheet.update(r.id, { status: "active" });
    qc.invalidateQueries({ queryKey: ["freightSheets"] });
  };

  const handleDelete = async (r) => {
    if (r.status !== "draft") return;
    // Fetch lines fresh from API to avoid stale cache issues
    const freshLines = await base44.entities.FreightSheetLine.filter({ sheet_id: r.id });
    for (const l of freshLines) {
      try { await base44.entities.FreightSheetLine.delete(l.id); } catch (_) {}
    }
    await base44.entities.FreightSheet.delete(r.id);
    qc.invalidateQueries({ queryKey: ["freightSheets"] });
    qc.invalidateQueries({ queryKey: ["allFreightLines"] });
  };

  const handleDuplicate = async (r) => {
    const srcLines = allLines.filter(l => l.sheet_id === r.id);
    const { id, created_date, updated_date, created_by, sheet_number, ...sheetData } = r;
    const newSheet = await base44.entities.FreightSheet.create({
      ...sheetData,
      sheet_number: "",
      status: "draft",
      valid_from: new Date().toISOString().split("T")[0],
      valid_to: "",
    });
    if (srcLines.length > 0) {
      const newLines = srcLines.map(({ id, created_date, updated_date, created_by, sheet_id, ...rest }) => ({
        ...rest,
        sheet_id: newSheet.id,
      }));
      await base44.entities.FreightSheetLine.bulkCreate(newLines);
    }
    qc.invalidateQueries({ queryKey: ["freightSheets"] });
    qc.invalidateQueries({ queryKey: ["allFreightLines"] });
  };

  const statusOrder = { active: 0, draft: 1, archived: 2 };
  const allCountries = [...new Set(sheets.map(s => s.destination_country).filter(Boolean))].sort();
  const filteredSheets = sheets
    .filter(s => showArchived || s.status !== "archived")
    .filter(s => !filterCountry || s.destination_country === filterCountry);
  const sortedSheets = [...filteredSheets].sort((a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3));

  const columns = [
    { header: "Carrier / Fuvarozó", render: r => (
      <div>
        <div className="font-semibold text-slate-800">{r.carrier_name || "—"}</div>
        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
          {r.sheet_number && <span className="text-xs text-slate-400 font-mono">{r.sheet_number}</span>}
          {r.alias && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase tracking-wide">{r.alias}</span>}
        </div>
      </div>
    )},
    { header: "Célország", render: r => (
      <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs">{r.destination_country || "—"}</span>
    )},
    { header: "Rakodás / Origin", render: r => (
      <div className="text-xs">
        <div className="text-slate-600">{r.origin_city || r.supplier_name || "-"}</div>
        {r.supplier_site_name && <div className="text-slate-400">{r.supplier_site_name}</div>}
      </div>
    )},
    { header: "Érvényesség", render: r => (
      <div className="text-xs">
        <div className="text-slate-700 font-medium">{r.valid_from}</div>
        <div className="text-slate-400">{r.valid_until_revoked ? "→ visszavonásig" : `→ ${r.valid_to || "?"}`}</div>
      </div>
    )},
    { header: "Sorok", render: r => (
      <span className="text-xs font-semibold text-slate-700">{lineCounts[r.id] || 0}</span>
    )},
    { header: "Load / Dev.", render: r => (
      <span className="text-xs text-slate-500">{r.default_load_tons}t · {r.currency}</span>
    )},
    { header: "Status", render: r => <StatusBadge status={r.status} /> },
    { header: "Műveletek", render: r => (
      <div className="flex gap-1 items-center" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setSelectedSheet(r)}
          title="Megnyitás"
          className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
        {isAdmin && r.status === "draft" && (
          <button
            onClick={() => handleActivate(r)}
            title="Aktiválás"
            className="text-slate-400 hover:text-green-600 p-1 rounded hover:bg-green-50 transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => handleDuplicate(r)}
          title="Másolás"
          className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        {isAdmin && r.status !== "archived" && (
          <button
            onClick={() => handleArchive(r)}
            title="Archiválás"
            className="text-slate-400 hover:text-amber-600 p-1 rounded hover:bg-amber-50 transition-colors"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
        )}
        {isAdmin && r.status === "archived" && (
          <button
            onClick={() => handleArchive(r)}
            title="Visszaállítás (Draft)"
            className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors text-[10px] font-semibold"
          >
            ↩
          </button>
        )}
        {isAdmin && (r.status === "draft" || r.status === "archived") && (
          <button
            onClick={() => handleDelete(r)}
            title={r.status === "draft" ? "Törlés (Draft)" : "Törlés (Archivált)"}
            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
          >
            <span className="text-xs font-bold">×</span>
          </button>
        )}
      </div>
    )},
  ];

  if (selectedSheet) {
    return (
      <FreightSheetDetail
        sheet={selectedSheet}
        user={user}
        onBack={() => setSelectedSheet(null)}
        onUpdated={() => {
          qc.invalidateQueries({ queryKey: ["freightSheets"] });
          qc.invalidateQueries({ queryKey: ["allFreightLines"] });
          setSelectedSheet(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fuvarozási lapok / Freight Sheets"
        subtitle="Fuvarozói árlap · Másolás · Verziókövetés · Nyomtatás"
        onAdd={() => { setEditItem(null); setShowForm(true); }}
        addLabel="Új lap"
      />

      <Tabs defaultValue="sheets">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="sheets"><FileText className="w-3.5 h-3.5 mr-1.5" />Fuvarozási lapok</TabsTrigger>
          <TabsTrigger value="analysis"><BarChart2 className="w-3.5 h-3.5 mr-1.5" />Kimutatás & Szimuláció</TabsTrigger>
        </TabsList>

        <TabsContent value="sheets" className="mt-4">
          {/* Status legend + show archived toggle */}
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex gap-3 flex-wrap text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Draft – szerkeszthető, aktiválható</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Active – módosítás = Új verzió</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block" /> Archived – csak olvasható</span>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowArchived(v => !v)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${showArchived ? "bg-slate-200 border-slate-300 text-slate-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}
              >
                {showArchived ? "🗂 Archivált elrejtése" : "🗂 Archivált megjelenítése"}
              </button>
            )}
          </div>

          {showForm && (
            <FreightSheetForm
              item={editItem}
              onClose={() => { setShowForm(false); setEditItem(null); }}
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ["freightSheets"] });
                setShowForm(false);
                setEditItem(null);
              }}
            />
          )}

          <DataTable
            columns={columns}
            data={sortedSheets}
            isLoading={isLoading}
            onRowClick={r => setSelectedSheet(r)}
            emptyMessage={
              <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                <FileText className="w-8 h-8 opacity-30" />
                <p className="text-sm">Még nincs fuvarozási lap. Hozz létre egyet!</p>
              </div>
            }
          />
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          <FreightSheetAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
}
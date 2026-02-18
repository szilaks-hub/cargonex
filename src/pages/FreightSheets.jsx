import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import FreightSheetForm from "@/components/freightsheet/FreightSheetForm";
import FreightSheetDetail from "@/components/freightsheet/FreightSheetDetail";
import { Button } from "@/components/ui/button";
import { FileText, Copy, Archive, CheckCircle2, Eye } from "lucide-react";

export default function FreightSheets() {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
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

  const handleDelete = async (r) => {
    if (r.status !== "draft") return;
    const lines = allLines.filter(l => l.sheet_id === r.id);
    for (const l of lines) await base44.entities.FreightSheetLine.delete(l.id);
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
  const sortedSheets = [...sheets].sort((a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3));

  const columns = [
    { header: "Carrier / Fuvarozó", render: r => (
      <div>
        <div className="font-semibold text-slate-800">{r.carrier_name || "—"}</div>
        {r.sheet_number && <div className="text-xs text-slate-400 font-mono">{r.sheet_number}</div>}
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
          onClick={() => handleDuplicate(r)}
          title="Duplicate / Másolás"
          className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleArchive(r)}
          title={r.status === "archived" ? "Visszaállítás" : "Archiválás"}
          className="text-slate-400 hover:text-amber-600 p-1 rounded hover:bg-amber-50 transition-colors"
        >
          <Archive className="w-3.5 h-3.5" />
        </button>
        {r.status === "draft" && (
          <button
            onClick={() => handleDelete(r)}
            title="Delete (Draft only)"
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

      {/* Status legend */}
      <div className="flex gap-3 flex-wrap text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Draft – szerkeszthető, törölhető</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Active – módosítás = Új verzió</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block" /> Archived – csak olvasható</span>
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
        onRowClick={r => r.status !== "archived" && setSelectedSheet(r)}
        emptyMessage={
          <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
            <FileText className="w-8 h-8 opacity-30" />
            <p className="text-sm">Még nincs fuvarozási lap. Hozz létre egyet!</p>
          </div>
        }
      />
    </div>
  );
}
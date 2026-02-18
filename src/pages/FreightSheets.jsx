import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import RowActions from "@/components/ui/RowActions";
import FreightSheetForm from "@/components/freightsheet/FreightSheetForm";
import FreightSheetDetail from "@/components/freightsheet/FreightSheetDetail";
import { FileText } from "lucide-react";

export default function FreightSheets() {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const qc = useQueryClient();

  const { data: sheets = [], isLoading } = useQuery({
    queryKey: ["freightSheets"],
    queryFn: () => base44.entities.FreightSheet.list("-valid_from"),
  });

  const handleArchive = async (r) => {
    const newStatus = r.status === "archived" ? "active" : "archived";
    await base44.entities.FreightSheet.update(r.id, { status: newStatus });
    qc.invalidateQueries({ queryKey: ["freightSheets"] });
  };

  const handleDelete = async (r) => {
    await base44.entities.FreightSheet.delete(r.id);
    qc.invalidateQueries({ queryKey: ["freightSheets"] });
  };

  const columns = [
    { header: "Lap / Sheet", render: r => (
      <div>
        <div className="font-semibold text-slate-800">{r.carrier_name || "—"}</div>
        {r.sheet_number && <div className="text-xs text-slate-400 font-mono">{r.sheet_number}</div>}
      </div>
    )},
    { header: "Célország", render: r => (
      <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs">{r.destination_country || "—"}</span>
    )},
    { header: "Beszállító / Telephely", render: r => (
      <div>
        <div className="text-xs text-slate-600">{r.supplier_name || "-"}</div>
        {r.supplier_site_name && <div className="text-xs text-slate-400">{r.supplier_site_name}</div>}
      </div>
    )},
    { header: "Érvényesség", render: r => (
      <div className="text-xs">
        <div className="text-slate-700">{r.valid_from}</div>
        <div className="text-slate-400">{r.valid_until_revoked ? "→ visszavonásig" : `→ ${r.valid_to || "?"}`}</div>
      </div>
    )},
    { header: "Kiterh.", render: r => <span className="text-xs text-slate-600">{r.default_load_tons} t</span> },
    { header: "Deviza", key: "currency" },
    { header: "Incoterms", key: "incoterms" },
    { header: "Status", render: r => <StatusBadge status={r.status} /> },
    { header: "", render: r => (
      <RowActions
        onEdit={() => { setEditItem(r); setShowForm(true); }}
        onArchive={() => handleArchive(r)}
        isArchived={r.status === "archived"}
        canDelete={r.status === "archived"}
        onDelete={() => handleDelete(r)}
      />
    )},
  ];

  if (selectedSheet) {
    return (
      <FreightSheetDetail
        sheet={selectedSheet}
        onBack={() => setSelectedSheet(null)}
        onUpdated={() => { qc.invalidateQueries({ queryKey: ["freightSheets"] }); setSelectedSheet(null); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fuvarozási lapok / Freight Sheets"
        subtitle="Fuvarozónként és célországonként · Nyilatkozat nyomtatással"
        onAdd={() => { setEditItem(null); setShowForm(true); }}
        addLabel="Új lap / New Sheet"
      />
      {showForm && (
        <FreightSheetForm
          item={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["freightSheets"] }); setShowForm(false); setEditItem(null); }}
        />
      )}
      <DataTable
        columns={columns}
        data={sheets}
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
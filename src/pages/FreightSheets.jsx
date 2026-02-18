import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import FreightSheetForm from "@/components/freightsheet/FreightSheetForm";
import FreightSheetDetail from "@/components/freightsheet/FreightSheetDetail";
import { Printer } from "lucide-react";

export default function FreightSheets() {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selected, setSelected] = useState(null);
  const qc = useQueryClient();

  const { data: sheets = [], isLoading } = useQuery({
    queryKey: ["freightSheets"],
    queryFn: () => base44.entities.FreightSheet.list("-created_date"),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["freightSheets"] });

  if (selected) {
    return (
      <FreightSheetDetail
        sheet={selected}
        onBack={() => setSelected(null)}
        onUpdated={() => {
          refresh();
          // Refresh the selected sheet data
          base44.entities.FreightSheet.filter({ id: selected.id }).then(r => r[0] && setSelected(r[0]));
        }}
      />
    );
  }

  const columns = [
    { header: "Sheet # / Sorszám", render: r => (
      <span className="font-mono font-semibold text-blue-700">{r.sheet_number || `FS-${r.id?.slice(0, 6)}`}</span>
    )},
    { header: "Carrier / Fuvarozó", key: "carrier_name" },
    { header: "Supplier / Beszállító", key: "supplier_name" },
    { header: "Loading Site", key: "supplier_location_name" },
    { header: "Destination", render: r => (
      <span className="font-medium">{r.destination_country}</span>
    )},
    { header: "Incoterms", key: "incoterms" },
    { header: "Valid From", key: "valid_from" },
    { header: "Valid To", render: r => r.open_ended ? <span className="text-slate-400 italic text-xs">visszavonásig</span> : (r.valid_to || "–") },
    { header: "Load (t)", render: r => r.default_load_tons || 24 },
    { header: "Status", render: r => <StatusBadge status={r.status} /> },
    { header: "", render: r => (
      <button
        onClick={e => { e.stopPropagation(); setSelected(r); }}
        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
        title="Open / Print"
      >
        <Printer className="w-4 h-4" />
      </button>
    )},
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Freight Sheets / Fuvarozási Lapok"
        subtitle="1 lap = 1 fuvarozó + 1 célország + 1 időszak"
        onAdd={() => { setEditItem(null); setShowForm(true); }}
        addLabel="New Sheet / Új lap"
      />
      {showForm && (
        <FreightSheetForm
          item={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={() => { refresh(); setShowForm(false); setEditItem(null); }}
        />
      )}
      <DataTable
        columns={columns}
        data={sheets}
        isLoading={isLoading}
        onRowClick={r => setSelected(r)}
      />
    </div>
  );
}
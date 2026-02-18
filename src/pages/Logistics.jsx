import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import TruckForm from "@/components/logistics/TruckForm";
import ShipmentMap from "@/components/logistics/ShipmentMap";
import RowActions from "@/components/ui/RowActions";
import { Map, List } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Logistics() {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [view, setView] = useState("list");
  const qc = useQueryClient();

  const { data: trucks = [], isLoading } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => base44.entities.Truck.list("-created_date"),
  });

  const handleArchive = async (r) => {
    await base44.entities.Truck.update(r.id, { status: "cancelled" });
    qc.invalidateQueries({ queryKey: ["trucks"] });
  };

  const handleDelete = async (r) => {
    await base44.entities.Truck.delete(r.id);
    qc.invalidateQueries({ queryKey: ["trucks"] });
  };

  const columns = [
    { header: "Truck # / Szám", render: (r) => (
      <span className={r.status === "cancelled" ? "opacity-40 line-through" : ""}>{r.truck_number || `T-${r.id?.slice(0, 6)}`}</span>
    )},
    { header: "Loading Date", key: "expected_loading_date" },
    { header: "Product / Termék", key: "product_name" },
    { header: "Planned (t)", render: (r) => r.planned_quantity_tons?.toFixed(2) || "-" },
    { header: "Actual (t)", render: (r) => r.actual_weight_tons?.toFixed(2) || "-" },
    { header: "Carrier / Fuvarozó", render: (r) => r.carrier_name || "-" },
    { header: "Destination", render: (r) => `${r.destination_country || ""} ${r.destination_city || ""}`.trim() || "-" },
    { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { header: "", render: (r) => (
      <RowActions
        onEdit={() => { setEditItem(r); setShowForm(true); }}
        lockedMsg={r.status === "closed" ? "Closed – Reopen in Finance" : null}
        onArchive={r.status !== "closed" ? () => handleArchive(r) : null}
        isArchived={r.status === "cancelled"}
        canDelete={r.status === "cancelled"}
        onDelete={() => handleDelete(r)}
      />
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <PageHeader
          title="Logistics / Logisztika"
          subtitle="Truck scheduling and loading / Kamionok ütemezés és rakodás"
          onAdd={() => { setEditItem(null); setShowForm(true); }}
          addLabel="New Truck / Új kamion"
        />
        <div className="flex items-center gap-1 rounded-lg p-1 mt-0.5" style={{ background: "#e4e7ec" }}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setView("list")}
            className={`gap-1.5 text-xs h-7 px-3 ${view === "list" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
          >
            <List className="w-3.5 h-3.5" /> List
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setView("map")}
            className={`gap-1.5 text-xs h-7 px-3 ${view === "map" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
          >
            <Map className="w-3.5 h-3.5" /> Map
          </Button>
        </div>
      </div>

      {showForm && (
        <TruckForm
          item={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["trucks"] }); setShowForm(false); setEditItem(null); }}
        />
      )}

      {view === "list" ? (
        <DataTable columns={columns} data={trucks} isLoading={isLoading} onRowClick={(r) => { setEditItem(r); setShowForm(true); }} />
      ) : (
        <ShipmentMap trucks={trucks} />
      )}
    </div>
  );
}
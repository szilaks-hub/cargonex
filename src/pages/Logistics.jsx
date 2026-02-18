import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import TruckForm from "@/components/logistics/TruckForm";

export default function Logistics() {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const qc = useQueryClient();

  const { data: trucks = [], isLoading } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => base44.entities.Truck.list("-created_date"),
  });

  const columns = [
    { header: "Truck # / Szám", render: (r) => r.truck_number || `T-${r.id?.slice(0, 6)}` },
    { header: "Loading Date / Rakodás", key: "expected_loading_date" },
    { header: "Product / Termék", key: "product_name" },
    { header: "Planned (t)", render: (r) => r.planned_quantity_tons?.toFixed(2) || "-" },
    { header: "Actual (t)", render: (r) => r.actual_weight_tons?.toFixed(2) || "-" },
    { header: "Carrier / Fuvarozó", key: "carrier_name", render: (r) => r.carrier_name || "-" },
    { header: "Destination", render: (r) => `${r.destination_country || ""} ${r.destination_city || ""}`.trim() || "-" },
    { header: "Order", key: "order_number", render: (r) => r.order_number || "-" },
    { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Logistics / Logisztika"
        subtitle="Truck scheduling and loading / Kamionok ütemezés és rakodás"
        onAdd={() => { setEditItem(null); setShowForm(true); }}
        addLabel="New Truck / Új kamion"
      />
      {showForm && (
        <TruckForm
          item={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["trucks"] }); setShowForm(false); setEditItem(null); }}
        />
      )}
      <DataTable columns={columns} data={trucks} isLoading={isLoading} onRowClick={(r) => { setEditItem(r); setShowForm(true); }} />
    </div>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import FreightRateForm from "@/components/freight/FreightRateForm";

export default function FreightRates() {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const qc = useQueryClient();

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ["freightRates"],
    queryFn: () => base44.entities.FreightRate.list(),
  });

  const columns = [
    { header: "Carrier / Fuvarozó", key: "carrier_name" },
    { header: "From / Honnan", key: "supplier_location_name", render: (r) => r.supplier_location_name || "-" },
    { header: "Country / Ország", key: "destination_country" },
    { header: "Region", key: "destination_region", render: (r) => r.destination_region || "-" },
    { header: "City", key: "destination_city", render: (r) => r.destination_city || "-" },
    { header: "Foreign Rate", render: (r) => r.foreign_rate?.toLocaleString() || "-" },
    { header: "Domestic Rate", render: (r) => r.domestic_rate?.toLocaleString() || "-" },
    { header: "Total", render: (r) => r.total_freight_cost?.toLocaleString() || "-" },
    { header: "Currency", key: "currency" },
    { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Freight Rates / Fuvardíjak"
        subtitle="Freight rate management / Fuvardíj kezelés"
        onAdd={() => { setEditItem(null); setShowForm(true); }}
        addLabel="New Rate / Új fuvardíj"
      />
      {showForm && (
        <FreightRateForm
          item={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["freightRates"] }); setShowForm(false); setEditItem(null); }}
        />
      )}
      <DataTable columns={columns} data={rates} isLoading={isLoading} onRowClick={(r) => { setEditItem(r); setShowForm(true); }} />
    </div>
  );
}
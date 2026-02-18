import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import FreightRateForm from "@/components/freight/FreightRateForm";
import RowActions from "@/components/ui/RowActions";

export default function FreightRates() {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const qc = useQueryClient();

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ["freightRates"],
    queryFn: () => base44.entities.FreightRate.list(),
  });

  const handleArchive = async (r) => {
    const newStatus = r.status === "archived" ? "active" : "archived";
    await base44.entities.FreightRate.update(r.id, { status: newStatus });
    qc.invalidateQueries({ queryKey: ["freightRates"] });
  };

  const handleDelete = async (r) => {
    await base44.entities.FreightRate.delete(r.id);
    qc.invalidateQueries({ queryKey: ["freightRates"] });
  };

  const columns = [
    { header: "Carrier / Fuvarozó", render: (r) => (
      <span className={r.status === "archived" ? "opacity-40 line-through" : ""}>{r.carrier_name}</span>
    )},
    { header: "From / Honnan", render: (r) => r.supplier_location_name || "-" },
    { header: "Country / Ország", key: "destination_country" },
    { header: "City", render: (r) => r.destination_city || "-" },
    { header: "Foreign Rate", render: (r) => r.foreign_rate?.toLocaleString() || "-" },
    { header: "Domestic Rate", render: (r) => r.domestic_rate?.toLocaleString() || "-" },
    { header: "Total", render: (r) => r.total_freight_cost?.toLocaleString() || "-" },
    { header: "Curr.", key: "currency" },
    { header: "Valid From", key: "valid_from", render: (r) => r.valid_from || "-" },
    { header: "Valid To", key: "valid_to", render: (r) => r.valid_to || "-" },
    { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { header: "", render: (r) => (
      <RowActions
        onEdit={() => { setEditItem(r); setShowForm(true); }}
        onArchive={() => handleArchive(r)}
        isArchived={r.status === "archived"}
        canDelete={r.status === "archived"}
        onDelete={() => handleDelete(r)}
      />
    )},
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Freight Rates / Fuvardíjak"
        subtitle="Period-based versioning – new period = new record / Időszakonként verziókezelve"
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
      <DataTable columns={columns} data={rates} isLoading={isLoading} onRowClick={() => {}} />
    </div>
  );
}
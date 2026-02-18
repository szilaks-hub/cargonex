import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import PartnerForm from "@/components/partners/PartnerForm";
import PartnerDetail from "@/components/partners/PartnerDetail";
import RowActions from "@/components/ui/RowActions";
import { Badge } from "@/components/ui/badge";
import { COUNTRIES } from "@/components/partners/CountryPicker";

const roleColors = {
  supplier: "bg-blue-50 text-blue-700 border-blue-200",
  customer: "bg-green-50 text-green-700 border-green-200",
  carrier: "bg-orange-50 text-orange-700 border-orange-200",
  customs_agent: "bg-purple-50 text-purple-700 border-purple-200",
};

export default function Partners() {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const qc = useQueryClient();

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["partners"],
    queryFn: () => base44.entities.Partner.list(),
  });

  const handleArchive = async (r) => {
    const newStatus = r.status === "archived" ? "active" : "archived";
    await base44.entities.Partner.update(r.id, { status: newStatus });
    qc.invalidateQueries({ queryKey: ["partners"] });
  };

  const handleDelete = async (r) => {
    await base44.entities.Partner.delete(r.id);
    qc.invalidateQueries({ queryKey: ["partners"] });
  };

  const columns = [
    { header: "Name / Név", render: (r) => (
      <span className={r.status === "archived" ? "opacity-40 line-through" : ""}>{r.name}</span>
    )},
    { header: "Roles / Szerepek", render: (r) => (
      <div className="flex flex-wrap gap-1">
        {(r.roles || []).map((role) => (
          <Badge key={role} variant="outline" className={`${roleColors[role] || ""} border text-[10px]`}>
            {role.replace(/_/g, " ")}
          </Badge>
        ))}
      </div>
    )},
    { header: "Country / Ország", key: "country", render: (r) => r.country || "-" },
    { header: "Email", key: "email", render: (r) => r.email || "-" },
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

  if (selectedPartner) {
    return (
      <PartnerDetail
        partner={selectedPartner}
        onBack={() => setSelectedPartner(null)}
        onUpdated={() => { qc.invalidateQueries({ queryKey: ["partners"] }); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Partners / Partnerek"
        subtitle="Partner master database / Partner törzs"
        onAdd={() => { setEditItem(null); setShowForm(true); }}
        addLabel="New Partner / Új partner"
      />
      {showForm && (
        <PartnerForm
          item={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["partners"] }); setShowForm(false); setEditItem(null); }}
        />
      )}
      <DataTable
        columns={columns}
        data={partners}
        isLoading={isLoading}
        onRowClick={(r) => r.status !== "archived" && setSelectedPartner(r)}
      />
    </div>
  );
}
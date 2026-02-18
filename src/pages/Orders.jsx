import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import OrderForm from "@/components/orders/OrderForm";
import OrderDetail from "@/components/orders/OrderDetail";
import RowActions from "@/components/ui/RowActions";

export default function Orders() {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const qc = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.PurchaseOrder.list("-created_date"),
  });

  const columns = [
    { header: "Order # / Szám", key: "order_number", render: (r) => r.order_number || `PO-${r.id?.slice(0, 6)}` },
    { header: "Supplier / Beszállító", key: "supplier_name" },
    { header: "Incoterms", key: "incoterms" },
    { header: "Date / Dátum", key: "order_date" },
    { header: "Total Tons", render: (r) => r.total_ordered_tons?.toFixed(2) || "-" },
    { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  if (selectedOrder) {
    return <OrderDetail order={selectedOrder} onBack={() => setSelectedOrder(null)} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Orders / Rendelések"
        subtitle="Purchase orders / Beszerzési rendelések"
        onAdd={() => { setEditItem(null); setShowForm(true); }}
        addLabel="New Order / Új rendelés"
      />
      {showForm && (
        <OrderForm
          item={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["orders"] }); setShowForm(false); setEditItem(null); }}
        />
      )}
      <DataTable columns={columns} data={orders} isLoading={isLoading} onRowClick={(r) => setSelectedOrder(r)} />
    </div>
  );
}
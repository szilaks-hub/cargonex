import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import TruckCustomsDetail from "../components/finance/TruckCustomsDetail";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function Finance() {
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: trucks = [], isLoading } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => base44.entities.Truck.list("-created_date"),
  });

  // Only show loaded+ trucks
  const eligibleTrucks = useMemo(() => {
    return trucks.filter((t) =>
      ["loaded", "in_transit", "customs", "closed"].includes(t.status)
    );
  }, [trucks]);

  const filtered = useMemo(() => {
    if (!search) return eligibleTrucks;
    const s = search.toLowerCase();
    return eligibleTrucks.filter((t) =>
      (t.truck_number || "").toLowerCase().includes(s) ||
      (t.product_name || "").toLowerCase().includes(s) ||
      (t.carrier_name || "").toLowerCase().includes(s) ||
      (t.mrn_number || "").toLowerCase().includes(s)
    );
  }, [eligibleTrucks, search]);

  const columns = [
    { header: "Truck #", render: (r) => r.truck_number || `T-${r.id?.slice(0, 6)}` },
    { header: "Product", key: "product_name" },
    { header: "Actual (t)", render: (r) => r.actual_weight_tons?.toFixed(2) || "-" },
    { header: "Carrier", key: "carrier_name", render: (r) => r.carrier_name || "-" },
    { header: "MRN", key: "mrn_number", render: (r) => r.mrn_number || "-" },
    { header: "Customs Value", render: (r) => r.calculated_customs_value?.toLocaleString() || "-" },
    { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  if (selectedTruck) {
    return (
      <TruckCustomsDetail
        truck={selectedTruck}
        onBack={() => setSelectedTruck(null)}
        onUpdated={() => {
          qc.invalidateQueries({ queryKey: ["trucks"] });
          setSelectedTruck(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Finance / Customs / AEO" subtitle="Customs clearance workflow / Vámkezelés" />
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" />
        <Input
          className="pl-9 bg-[#1a1e23] border-[#2d333b] text-[#e6edf3]"
          placeholder="Search truck, product, MRN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <DataTable columns={columns} data={filtered} isLoading={isLoading} onRowClick={(r) => setSelectedTruck(r)} />
    </div>
  );
}
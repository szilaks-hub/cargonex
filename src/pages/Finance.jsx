import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import TruckCustomsDetail from "../components/finance/TruckCustomsDetail";
import MrnStatistics from "../components/finance/MrnStatistics";
import { Input } from "@/components/ui/input";
import { Search, BarChart2, List } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Finance() {
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("list"); // "list" | "stats"
  const qc = useQueryClient();

  const { data: trucks = [], isLoading } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => base44.entities.Truck.list("-created_date"),
  });

  // Show finance_control and closed trucks
  const eligibleTrucks = useMemo(() => {
    return trucks.filter((t) =>
      ["loaded", "finance_control", "closed"].includes(t.status)
    );
  }, [trucks]);

  const filtered = useMemo(() => {
    if (!search) return eligibleTrucks;
    const s = search.toLowerCase();
    return eligibleTrucks.filter((t) =>
      (t.truck_number || "").toLowerCase().includes(s) ||
      (t.product_name || "").toLowerCase().includes(s) ||
      (t.carrier_name || "").toLowerCase().includes(s) ||
      (t.mrn_number || "").toLowerCase().includes(s) ||
      (t.supplier_invoice_number || "").toLowerCase().includes(s)
    );
  }, [eligibleTrucks, search]);

  const columns = [
    { header: "Rendszám", render: (r) => r.truck_number || `T-${r.id?.slice(0, 6)}` },
    { header: "Termék", key: "product_name" },
    { header: "Tény. (t)", render: (r) => r.actual_weight_tons?.toFixed(2) || "-" },
    { header: "Fuvarozó", key: "carrier_name", render: (r) => r.carrier_name || "-" },
    { header: "Eladó számlaszám", render: (r) => r.supplier_invoice_number || "-" },
    { header: "MRN szám", render: (r) => r.mrn_number || "-" },
    { header: "MRN dátum", render: (r) => r.mrn_date || "-" },
    { header: "Végösszeg (HUF)", render: (r) => r.total_base ? Number(r.total_base).toLocaleString("hu-HU") : "-" },
    { header: "Státusz", render: (r) => <StatusBadge status={r.status} /> },
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title="Finance / Customs / AEO" subtitle="Customs clearance workflow / Vámkezelés" />
        <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: "#e4e7ec" }}>
          <Button size="sm" variant="ghost" onClick={() => setTab("list")}
            className={`gap-1.5 text-xs h-7 px-3 ${tab === "list" ? "bg-white shadow-sm text-slate-800" : "text-slate-500"}`}>
            <List className="w-3.5 h-3.5" /> Lista
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setTab("stats")}
            className={`gap-1.5 text-xs h-7 px-3 ${tab === "stats" ? "bg-white shadow-sm text-slate-800" : "text-slate-500"}`}>
            <BarChart2 className="w-3.5 h-3.5" /> MRN Statisztika
          </Button>
        </div>
      </div>

      {tab === "list" && (
        <>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Keresés: rendszám, termék, MRN, számlaszám..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <DataTable columns={columns} data={filtered} isLoading={isLoading} onRowClick={(r) => setSelectedTruck(r)} />
        </>
      )}

      {tab === "stats" && (
        <MrnStatistics trucks={eligibleTrucks} />
      )}
    </div>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import TruckForm from "@/components/logistics/TruckForm";
import ShipmentMap from "@/components/logistics/ShipmentMap";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Map, List, Truck, Package, ArrowRight, Home, Building2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_TABS = [
  { key: "all", label: "Összes", color: "" },
  { key: "booked", label: "Előjegyzett", color: "text-slate-600" },
  { key: "scheduled", label: "Ütemezett", color: "text-blue-600" },
  { key: "loaded", label: "Megrakott", color: "text-amber-600" },
  { key: "in_transit", label: "Úton", color: "text-purple-600" },
  { key: "customs", label: "Vámon", color: "text-orange-600" },
  { key: "transit", label: "TR", color: "text-cyan-600" },
  { key: "arrived", label: "Érkezett", color: "text-emerald-600" },
  { key: "closed", label: "Lezárt", color: "text-green-700" },
  { key: "cancelled", label: "Törölve", color: "text-red-500" },
];

const STATUS_ADVANCE = {
  booked: "scheduled",
  scheduled: "loaded",
  loaded: "in_transit",
  in_transit: { options: ["customs", "arrived_onsite", "arrived_offsite"] },
  customs: { options: ["arrived_onsite", "arrived_offsite"] },
  transit: { options: ["arrived_onsite", "arrived_offsite"] },
};

export default function Logistics() {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [view, setView] = useState("list");
  const [activeTab, setActiveTab] = useState("all");
  const qc = useQueryClient();

  const { data: trucks = [], isLoading } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => base44.entities.Truck.list("-created_date"),
  });

  const handleAdvanceStatus = async (truck, newStatus) => {
    await base44.entities.Truck.update(truck.id, { status: newStatus });
    qc.invalidateQueries({ queryKey: ["trucks"] });
    toast.success(`Státusz: ${newStatus}`);
  };

  const filteredTrucks = activeTab === "all"
    ? trucks
    : trucks.filter(t => t.status === activeTab);

  // Stats
  const stats = {
    booked: trucks.filter(t => t.status === "booked").length,
    scheduled: trucks.filter(t => t.status === "scheduled").length,
    loaded: trucks.filter(t => t.status === "loaded").length,
    in_transit: trucks.filter(t => t.status === "in_transit").length,
    customs: trucks.filter(t => t.status === "customs").length,
    transit: trucks.filter(t => t.status === "transit").length,
    arrived_onsite: trucks.filter(t => t.status === "arrived_onsite").length,
    arrived_offsite: trucks.filter(t => t.status === "arrived_offsite").length,
    closed: trucks.filter(t => t.status === "closed").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader
          title="Logistics / Logisztika"
          subtitle="Truck scheduling and loading / Kamionok ütemezés és rakodás"
          onAdd={() => { setEditItem(null); setShowForm(true); }}
          addLabel="New Truck / Új kamion"
        />
        <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: "#e4e7ec" }}>
          <Button size="sm" variant="ghost" onClick={() => setView("list")}
            className={`gap-1.5 text-xs h-7 px-3 ${view === "list" ? "bg-white shadow-sm text-slate-800" : "text-slate-500"}`}>
            <List className="w-3.5 h-3.5" /> List
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setView("map")}
            className={`gap-1.5 text-xs h-7 px-3 ${view === "map" ? "bg-white shadow-sm text-slate-800" : "text-slate-500"}`}>
            <Map className="w-3.5 h-3.5" /> Map
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {!showForm && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { label: "Előjegyzett", val: stats.booked, color: "bg-slate-100 text-slate-700", key: "booked" },
            { label: "Ütemezett", val: stats.scheduled, color: "bg-blue-50 text-blue-700", key: "scheduled" },
            { label: "Megrakott", val: stats.loaded, color: "bg-amber-50 text-amber-700", key: "loaded" },
            { label: "Úton", val: stats.in_transit, color: "bg-purple-50 text-purple-700", key: "in_transit" },
            { label: "Vámon", val: stats.customs, color: "bg-orange-50 text-orange-700", key: "customs" },
            { label: "TR", val: stats.transit, color: "bg-cyan-50 text-cyan-700", key: "transit" },
            { label: "Telephelyi", val: stats.arrived_onsite, color: "bg-emerald-50 text-emerald-700", key: "arrived_onsite" },
            { label: "Telephelyen kívüli", val: stats.arrived_offsite, color: "bg-teal-50 text-teal-700", key: "arrived_offsite" },
          ].map(s => (
            <Card
              key={s.key}
              className={`p-3 cursor-pointer transition-all ${s.color} ${activeTab === s.key ? 'ring-2 ring-blue-400' : 'hover:shadow-md'}`}
              onClick={() => setActiveTab(activeTab === s.key ? "all" : s.key)}
            >
              <div className="text-xs font-medium truncate">{s.label}</div>
              <div className="text-2xl font-bold">{s.val}</div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <TruckForm
          item={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["trucks"] });
            qc.invalidateQueries({ queryKey: ["orderbooks"] });
            qc.invalidateQueries({ queryKey: ["orderbook-lines"] });
            setShowForm(false);
            setEditItem(null);
          }}
        />
      )}

      {view === "map" ? (
        <ShipmentMap trucks={trucks} />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-100 flex-wrap h-auto gap-1 p-1">
            {STATUS_TABS.map(t => (
              <TabsTrigger key={t.key} value={t.key} className={`text-xs ${t.color}`}>
                {t.label}
                <Badge className="ml-1.5 bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0">
                  {t.key === "all" ? trucks.length : trucks.filter(x => x.status === t.key).length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {STATUS_TABS.map(t => (
            <TabsContent key={t.key} value={t.key} className="mt-3">
              <TruckTable
                trucks={filteredTrucks}
                isLoading={isLoading}
                onEdit={(r) => { setEditItem(r); setShowForm(true); }}
                onAdvance={handleAdvanceStatus}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

function TruckTable({ trucks, isLoading, onEdit, onAdvance }) {
  if (isLoading) return <div className="text-center py-8 text-slate-400">Betöltés...</div>;
  if (!trucks || trucks.length === 0) return <div className="text-center py-8 text-slate-400">Nincs adat / No data</div>;

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr className="text-left text-xs font-semibold text-slate-600">
              <th className="py-3 px-4">Rendszám</th>
              <th className="py-3 px-4">Rakodás dátuma</th>
              <th className="py-3 px-4">Rendelés</th>
              <th className="py-3 px-4">Termék</th>
              <th className="py-3 px-4 text-right">Tervezett (t)</th>
              <th className="py-3 px-4 text-right">Tényleges (t)</th>
              <th className="py-3 px-4">Fuvarozó</th>
              <th className="py-3 px-4">Célállomás</th>
              <th className="py-3 px-4">Státusz</th>
              <th className="py-3 px-4 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {trucks.map(r => (
              <tr key={r.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => onEdit(r)}>
                <td className="py-3 px-4 font-semibold text-slate-800">
                  {r.truck_number || <span className="text-slate-400 italic text-xs">Nincs rendszám</span>}
                </td>
                <td className="py-3 px-4 text-slate-600">{r.expected_loading_date || r.loading_date || "—"}</td>
                <td className="py-3 px-4">
                  <div className="text-xs font-medium text-blue-700">{r.orderbook_no || "—"}</div>
                </td>
                <td className="py-3 px-4 text-slate-700 text-xs max-w-32 truncate">{r.product_name || "—"}</td>
                <td className="py-3 px-4 text-right font-semibold text-slate-800">{r.planned_quantity_tons?.toFixed(2) || "—"}</td>
                <td className="py-3 px-4 text-right text-slate-600">{r.actual_weight_tons?.toFixed(2) || "—"}</td>
                <td className="py-3 px-4 text-slate-700 text-xs">{r.carrier_name || "—"}</td>
                <td className="py-3 px-4 text-slate-600 text-xs">
                  {r.destination_country} {r.destination_city ? `· ${r.destination_city}` : ""}
                </td>
                <td className="py-3 px-4">
                  <TruckStatusBadge status={r.status} />
                </td>
                <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                  <QuickStatusAdvance truck={r} onAdvance={onAdvance} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TruckStatusBadge({ status }) {
  const map = {
    booked: "bg-slate-100 text-slate-700",
    scheduled: "bg-blue-100 text-blue-800",
    loaded: "bg-amber-100 text-amber-800",
    in_transit: "bg-purple-100 text-purple-800",
    customs: "bg-orange-100 text-orange-800",
    transit: "bg-cyan-100 text-cyan-800",
    arrived: "bg-emerald-100 text-emerald-800",
    arrived_onsite: "bg-emerald-100 text-emerald-900",
    arrived_offsite: "bg-teal-100 text-teal-800",
    closed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  const labels = {
    booked: "Előjegyzett",
    scheduled: "Ütemezett",
    loaded: "Megrakott",
    in_transit: "Úton",
    customs: "Vámon",
    transit: "TR",
    arrived: "Érkezett",
    arrived_onsite: "Telephelyi",
    arrived_offsite: "Telephelyen kívüli",
    closed: "Lezárt",
    cancelled: "Törölve",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || "bg-slate-100 text-slate-600"}`}>
      {labels[status] || status}
    </span>
  );
}

function QuickStatusAdvance({ truck, onAdvance }) {
  const nextMap = {
    booked: [{ val: "scheduled", label: "→ Ütemez" }],
    scheduled: [{ val: "loaded", label: "→ Megrak" }],
    loaded: [{ val: "in_transit", label: "→ Útnak indul" }],
    in_transit: [
      { val: "customs", label: "→ Vámra" },
      { val: "arrived_onsite", label: "→ Telephely" },
      { val: "arrived_offsite", label: "→ Off-site" },
    ],
    customs: [
      { val: "arrived_onsite", label: "→ Telephely" },
      { val: "arrived_offsite", label: "→ Off-site" },
      { val: "transit", label: "→ TR" },
    ],
    transit: [
      { val: "arrived_onsite", label: "→ Telephely" },
      { val: "arrived_offsite", label: "→ Off-site" },
    ],
    arrived_onsite: [{ val: "closed", label: "→ Lezár" }],
    arrived_offsite: [{ val: "closed", label: "→ Lezár" }],
  };
  const options = nextMap[truck.status] || [];
  if (!options.length) return null;
  return (
    <div className="flex gap-1 justify-end flex-wrap">
      {options.map(opt => (
        <Button
          key={opt.val}
          size="sm"
          variant="outline"
          className="h-6 text-[10px] px-2 border-slate-300 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
          onClick={() => onAdvance(truck, opt.val)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
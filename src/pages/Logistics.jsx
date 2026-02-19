import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import TruckForm from "@/components/logistics/TruckForm";
import ShipmentMap from "@/components/logistics/ShipmentMap";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Map, List } from "lucide-react";
import { toast } from "sonner";

const STATUS_TABS = [
  { key: "all", label: "Összes" },
  { key: "booked", label: "Előjegyzett" },
  { key: "loaded", label: "Megrakott" },
  { key: "arrived_onsite", label: "Telephelyi" },
  { key: "closed", label: "Lezárt" },
  { key: "cancelled", label: "Törölve" },
];

const STATUS_LABELS = {
  booked: "Előjegyzett",
  loaded: "Megrakott",
  arrived_onsite: "Telephelyi",
  closed: "Lezárt",
  cancelled: "Törölve",
};

const STATUS_COLORS = {
  booked: "bg-slate-100 text-slate-700",
  loaded: "bg-amber-100 text-amber-800",
  arrived_onsite: "bg-emerald-100 text-emerald-900",
  closed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
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
    toast.success(`Státusz: ${STATUS_LABELS[newStatus] || newStatus}`);
  };

  const handleToggleTransit = async (truck) => {
    await base44.entities.Truck.update(truck.id, { transit: !truck.transit });
    qc.invalidateQueries({ queryKey: ["trucks"] });
  };

  const filteredTrucks = activeTab === "all"
    ? trucks
    : trucks.filter(t => t.status === activeTab);

  const stats = STATUS_TABS.reduce((acc, t) => {
    acc[t.key] = t.key === "all" ? trucks.length : trucks.filter(x => x.status === t.key).length;
    return acc;
  }, {});

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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {[
            { key: "booked", label: "Előjegyzett", color: "bg-slate-100 text-slate-700" },
            { key: "loaded", label: "Megrakott", color: "bg-amber-50 text-amber-700" },
            { key: "arrived_onsite", label: "Telephelyi", color: "bg-emerald-50 text-emerald-700" },
            { key: "closed", label: "Lezárt", color: "bg-green-50 text-green-700" },
            { key: "cancelled", label: "Törölve", color: "bg-red-50 text-red-500" },
          ].map(s => (
            <Card
              key={s.key}
              className={`p-3 cursor-pointer transition-all ${s.color} ${activeTab === s.key ? 'ring-2 ring-blue-400' : 'hover:shadow-md'}`}
              onClick={() => setActiveTab(activeTab === s.key ? "all" : s.key)}
            >
              <div className="text-xs font-medium truncate">{s.label}</div>
              <div className="text-2xl font-bold">{stats[s.key] || 0}</div>
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
          <TabsList className="bg-slate-100 flex-wrap h-auto gap-0.5 p-1">
            {STATUS_TABS.map(t => (
              <TabsTrigger key={t.key} value={t.key} className="text-xs">
                {t.label}
                <Badge className="ml-1.5 bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0">
                  {stats[t.key] || 0}
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
                statusLabels={STATUS_LABELS}
                statusColors={STATUS_COLORS}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

function TruckTable({ trucks, isLoading, onEdit, onAdvance, statusLabels, statusColors }) {
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
                <td className="py-3 px-4 text-slate-700 text-xs max-w-[8rem] truncate">{r.product_name || "—"}</td>
                <td className="py-3 px-4 text-right font-semibold text-slate-800">{r.planned_quantity_tons?.toFixed(2) || "—"}</td>
                <td className="py-3 px-4 text-right text-slate-600">{r.actual_weight_tons?.toFixed(2) || "—"}</td>
                <td className="py-3 px-4 text-slate-700 text-xs">{r.carrier_name || "—"}</td>
                <td className="py-3 px-4 text-slate-600 text-xs">
                  {r.destination_country}{r.destination_city ? ` · ${r.destination_city}` : ""}
                </td>
                <td className="py-3 px-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[r.status] || "bg-slate-100 text-slate-600"}`}>
                    {statusLabels[r.status] || r.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                  <QuickStatusAdvance truck={r} onAdvance={onAdvance} statusLabels={statusLabels} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function QuickStatusAdvance({ truck, onAdvance, statusLabels }) {
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
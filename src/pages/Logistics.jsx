import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import TruckForm from "@/components/logistics/TruckForm";
import ShipmentMap from "@/components/logistics/ShipmentMap";
import ShipmentStats from "@/components/logistics/ShipmentStats";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Map, List } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_TABS = [
  { key: "all", label: "Összes" },
  { key: "booked", label: "Előjegyzett" },
  { key: "loaded", label: "Megrakott" },
  { key: "closed", label: "Lezárt" },
  { key: "cancelled", label: "Törölve" },
];

const STATUS_LABELS = {
  booked: "Előjegyzett",
  scheduled: "Ütemezett",
  loaded: "Megrakott",
  in_transit: "Úton",
  customs: "Vámon",
  transit: "Tranzit",
  arrived: "Megérkezett",
  arrived_onsite: "Telephelyen",
  arrived_offsite: "Off-site",
  closed: "Lezárt",
  cancelled: "Törölve",
};

// Badge colors for status dropdown
const STATUS_COLORS = {
  booked: "bg-slate-100 text-slate-600",
  scheduled: "bg-blue-100 text-blue-700",
  loaded: "bg-orange-100 text-orange-700",
  in_transit: "bg-amber-100 text-amber-700",
  customs: "bg-purple-100 text-purple-700",
  transit: "bg-indigo-100 text-indigo-700",
  arrived: "bg-teal-100 text-teal-700",
  arrived_onsite: "bg-emerald-100 text-emerald-700",
  arrived_offsite: "bg-cyan-100 text-cyan-700",
  closed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

// Full row background colors per status
const ROW_BG = {
  booked: "",
  scheduled: "bg-blue-50/60",
  loaded: "bg-orange-50/70",
  in_transit: "bg-amber-50/70",
  customs: "bg-purple-50/70",
  transit: "bg-indigo-50/60",
  arrived: "bg-teal-50/70",
  arrived_onsite: "bg-emerald-50/70",
  arrived_offsite: "bg-cyan-50/60",
  closed: "bg-green-50/60",
  cancelled: "bg-red-50/50 opacity-70",
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
    refetchInterval: 10000,
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
            { key: "loaded", label: "Megrakott", color: "bg-orange-50 text-orange-700" },
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
          <Card className="p-3 bg-indigo-50 text-indigo-700">
            <div className="text-xs font-medium">Tranzit (TR)</div>
            <div className="text-2xl font-bold">{trucks.filter(t => t.transit).length}</div>
            <div className="text-[10px] text-indigo-400 mt-0.5">összes fuvarból</div>
          </Card>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ShipmentMap trucks={trucks} />
          </div>
          <div className="lg:col-span-1">
            <ShipmentStats trucks={trucks} />
          </div>
        </div>
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
        <table className="w-full" style={{ fontSize: "0.82rem" }}>
          <thead className="bg-slate-50 border-b">
            <tr className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              <th className="py-2 px-3">Rendszám</th>
              <th className="py-2 px-3">Rakodás</th>
              <th className="py-2 px-3">Rendelés</th>
              <th className="py-2 px-3">Termék</th>
              <th className="py-2 px-3 text-right">Terv. (t)</th>
              <th className="py-2 px-3 text-right">Tény. (t)</th>
              <th className="py-2 px-3">Fuvarozó</th>
              <th className="py-2 px-3">Célállomás</th>
              <th className="py-2 px-3">Státusz</th>
            </tr>
          </thead>
          <tbody>
            {trucks.map(r => {
              const rowBg = ROW_BG[r.status] || "";
              return (
                <tr
                  key={r.id}
                  className={`border-b cursor-pointer transition-colors hover:brightness-95 ${rowBg}`}
                  onClick={() => onEdit(r)}
                >
                  <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                    {r.truck_number
                      ? <span>{r.truck_number}{r.transit && <span className="ml-1 text-[9px] font-bold text-indigo-600 bg-indigo-100 rounded px-1">TR</span>}</span>
                      : <span className="text-slate-400 italic text-xs">—{r.transit && <span className="ml-1 text-[9px] font-bold text-indigo-600 bg-indigo-100 rounded px-1">TR</span>}</span>
                    }
                  </td>
                  <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{r.expected_loading_date || r.loading_date || "—"}</td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span className="text-xs font-medium text-blue-700">{r.orderbook_no || "—"}</span>
                  </td>
                  <td className="py-2 px-3 text-slate-700 max-w-[9rem] truncate">{r.product_name || "—"}</td>
                  <td className="py-2 px-3 text-right font-semibold text-slate-800 whitespace-nowrap">{r.planned_quantity_tons?.toFixed(2) || "—"}</td>
                  <td className="py-2 px-3 text-right text-slate-600 whitespace-nowrap">{r.actual_weight_tons?.toFixed(2) || "—"}</td>
                  <td className="py-2 px-3 text-slate-700 max-w-[8rem] truncate">{r.carrier_name || "—"}</td>
                  <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                    {r.destination_country}{r.destination_city ? ` · ${r.destination_city}` : ""}
                  </td>
                  <td className="py-2 px-3" onClick={e => e.stopPropagation()}>
                    <StatusDropdown truck={r} onAdvance={onAdvance} statusLabels={statusLabels} statusColors={statusColors} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function StatusDropdown({ truck, onAdvance, statusLabels, statusColors }) {
  const allStatuses = Object.keys(statusLabels);
  return (
    <Select value={truck.status} onValueChange={(val) => onAdvance(truck, val)}>
      <SelectTrigger className={`h-7 text-xs w-32 font-medium border-0 ${statusColors[truck.status] || "bg-slate-100 text-slate-600"}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-white">
        {allStatuses.map(s => (
          <SelectItem key={s} value={s} className="text-xs">
            {statusLabels[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function QuickStatusAdvance({ truck, onAdvance, statusLabels }) {
  const nextMap = {
    booked: [{ val: "loaded", label: "→ Megrakott" }],
    loaded: [{ val: "closed", label: "→ Lezár" }],
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
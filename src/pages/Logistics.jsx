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
  { key: "booked", label: "Előjegyzett" },
  { key: "loaded", label: "Megrakott" },
];

const STATUS_LABELS = {
  booked: "Előjegyzett",
  loaded: "Megrakott",
  finance_control: "Pénzügyi kontrol",
  closed: "Lezárt",
  cancelled: "Törölve",
};

// Badge colors for status dropdown
const STATUS_COLORS = {
  booked: "bg-slate-100 text-slate-600",
  loaded: "bg-orange-100 text-orange-700",
  finance_control: "bg-yellow-100 text-yellow-700",
  closed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

// Full row background colors per status
const ROW_BG = {
  booked: "",
  loaded: "bg-orange-50/70",
  finance_control: "bg-yellow-50/80",
  closed: "bg-green-50/60",
  cancelled: "bg-red-50/50 opacity-70",
};

export default function Logistics() {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [view, setView] = useState("list");
  const [activeTab, setActiveTab] = useState("booked");
  const qc = useQueryClient();

  const { data: trucks = [], isLoading } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => base44.entities.Truck.list("-created_date"),
    refetchInterval: 10000,
  });

  const handleAdvanceStatus = async (truck, newStatus) => {
    if (newStatus === "finance_control") {
      // Set to finance_control AND closed so it appears in Finance page
      await base44.entities.Truck.update(truck.id, { status: "finance_control", closed_date: new Date().toISOString().split("T")[0] });
      qc.invalidateQueries({ queryKey: ["trucks"] });
      toast.success("Pénzügyi kontrol – átkerült a Finance/Customs ellenőrzésre");
    } else {
      await base44.entities.Truck.update(truck.id, { status: newStatus });
      qc.invalidateQueries({ queryKey: ["trucks"] });
      toast.success(`Státusz: ${STATUS_LABELS[newStatus] || newStatus}`);
    }
  };

  const handleToggleTransit = async (truck) => {
    await base44.entities.Truck.update(truck.id, { transit: !truck.transit });
    qc.invalidateQueries({ queryKey: ["trucks"] });
  };

  const filteredTrucks = trucks.filter(t => t.status === activeTab);
  
  const transitTrucks = trucks.filter(t => t.transit && ["booked", "loaded"].includes(t.status));
  const totalActiveTrucks = trucks.filter(t => ["booked", "loaded"].includes(t.status)).length;
  const transitRatio = totalActiveTrucks > 0 ? ((transitTrucks.length / totalActiveTrucks) * 100).toFixed(1) : 0;

  const stats = STATUS_TABS.reduce((acc, t) => {
    acc[t.key] = t.key === "all" ? trucks.length : trucks.filter(x => x.status === t.key).length;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="text-center space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Logistics / Logisztika</h1>
          <p className="text-sm text-slate-500 mt-1">Truck scheduling and loading / Kamionok ütemezés és rakodás</p>
        </div>
        <Button 
          onClick={() => { setEditItem(null); setShowForm(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6"
        >
          + New Truck / Új kamion
        </Button>
      </div>

      {/* Transit Statistics */}
      {!showForm && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-700">Tranzit arány</div>
              <div className="text-xs text-slate-500 mt-0.5">Teljes fuvarszervezéshez képest</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">{transitTrucks.length}</div>
                <div className="text-xs text-slate-500">tranzit kamion</div>
              </div>
              <div className="text-slate-300 text-3xl">/</div>
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-700">{totalActiveTrucks}</div>
                <div className="text-xs text-slate-500">összes aktív</div>
              </div>
              <div className="text-center ml-2">
                <div className="text-4xl font-bold text-purple-600">{transitRatio}%</div>
                <div className="text-xs text-slate-500">tranzit ráta</div>
              </div>
            </div>
          </div>
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
          <TabsList className="bg-white border border-slate-200 p-1 rounded-lg">
            {STATUS_TABS.map(t => (
              <TabsTrigger 
                key={t.key} 
                value={t.key} 
                className="text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md px-4"
              >
                {t.label}
                <Badge className={`ml-2 text-xs px-2 py-0 ${activeTab === t.key ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {stats[t.key] || 0}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {STATUS_TABS.map(t => (
            <TabsContent key={t.key} value={t.key} className="mt-4">
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
  const availableStatuses = ["booked", "loaded"];
  return (
    <Select value={truck.status} onValueChange={(val) => onAdvance(truck, val)}>
      <SelectTrigger className={`h-8 text-sm w-36 font-semibold rounded-lg border-2 transition-all ${
        truck.status === "booked" 
          ? "bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100" 
          : "bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100"
      }`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-white border border-slate-200 rounded-lg shadow-lg">
        {availableStatuses.map(s => (
          <SelectItem 
            key={s} 
            value={s} 
            className={`text-sm font-medium cursor-pointer ${
              s === "booked" ? "hover:bg-slate-100" : "hover:bg-orange-100"
            }`}
          >
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
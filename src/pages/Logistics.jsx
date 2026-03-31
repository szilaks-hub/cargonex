import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import TruckForm from "@/components/logistics/TruckForm";
import LogisticsCalendar from "@/components/logistics/LogisticsCalendar";
import DailyLoadingStats from "@/components/logistics/DailyLoadingStats";
import LoadingStatsPanel from "@/components/logistics/LoadingStatsPanel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { List, CalendarDays, BarChart2 } from "lucide-react";
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
  const [view, setView] = useState("list"); // "list" | "calendar" | "stats"
  const [activeTab, setActiveTab] = useState("booked");
  const [carrierFilter, setCarrierFilter] = useState("");
  const [destinationFilter, setDestinationFilter] = useState("");
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

  const tabTrucks = trucks.filter(t => t.status === activeTab);

  // Unique carriers and destinations for filter dropdowns
  const allCarriers = [...new Set(trucks.filter(t => t.carrier_name).map(t => t.carrier_name))].sort();
  const allDestinations = [...new Set(trucks.filter(t => t.destination_country).map(t =>
    t.destination_city ? `${t.destination_country} · ${t.destination_city}` : t.destination_country
  ))].sort();

  const filteredTrucks = tabTrucks.filter(t => {
    if (carrierFilter && t.carrier_name !== carrierFilter) return false;
    if (destinationFilter) {
      const dest = t.destination_city ? `${t.destination_country} · ${t.destination_city}` : t.destination_country;
      if (dest !== destinationFilter) return false;
    }
    return true;
  });
  
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
        <div className="flex items-center justify-center gap-2">
          <Button
            onClick={() => { setEditItem(null); setShowForm(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          >
            + New Truck / Új kamion
          </Button>
          <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white">
            <button
              onClick={() => setView("list")}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${view === "list" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <List className="w-4 h-4" /> Lista
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${view === "calendar" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <CalendarDays className="w-4 h-4" /> Naptár
            </button>
            <button
              onClick={() => setView("stats")}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${view === "stats" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <BarChart2 className="w-4 h-4" /> Statisztikák
            </button>
          </div>
        </div>
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

      {!showForm && view === "stats" && <LoadingStatsPanel trucks={trucks} />}



      {view === "calendar" && !showForm && (
        <LogisticsCalendar
          trucks={trucks}
          onEdit={(r) => { setEditItem(r); setShowForm(true); }}
        />
      )}

      {view === "list" && !showForm && (
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

          {/* Filters */}
          <div className="flex flex-wrap gap-3 my-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Fuvarozó:</span>
              <Select value={carrierFilter || "__all"} onValueChange={v => setCarrierFilter(v === "__all" ? "" : v)}>
                <SelectTrigger className="h-8 w-48 text-sm bg-white">
                  <SelectValue placeholder="Mind" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="__all">Mind</SelectItem>
                  {allCarriers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Célállomás:</span>
              <Select value={destinationFilter || "__all"} onValueChange={v => setDestinationFilter(v === "__all" ? "" : v)}>
                <SelectTrigger className="h-8 w-52 text-sm bg-white">
                  <SelectValue placeholder="Mind" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="__all">Mind</SelectItem>
                  {allDestinations.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(carrierFilter || destinationFilter) && (
              <button onClick={() => { setCarrierFilter(""); setDestinationFilter(""); }} className="text-xs text-blue-600 hover:underline">
                Szűrők törlése
              </button>
            )}
          </div>

          {STATUS_TABS.map(t => (
            <TabsContent key={t.key} value={t.key} className="mt-2">
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
                    {r.orderbook_no && <div className="text-[10px] text-slate-600"><span className="font-semibold text-slate-400">Rsz.:</span> <span className="text-blue-700 font-medium">{r.orderbook_no}</span></div>}
                    {r.order_number && <div className="text-[10px] text-slate-500"><span className="font-semibold text-slate-400">Besz.:</span> {r.order_number}</div>}
                    {!r.orderbook_no && !r.order_number && <span className="text-slate-400">—</span>}
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
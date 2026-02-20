import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Truck, FileText, Search, X } from "lucide-react";

const STATUS_LABELS = {
  booked: "Előjegyzett",
  scheduled: "Ütemezett",
  loaded: "Megrakott",
  in_transit: "Úton",
  customs: "Vámon",
  transit: "Tranzit",
  arrived: "Megérkezett",
  arrived_onsite: "Telephelyen",
  arrived_offsite: "Kézbesítve",
  closed: "Lezárt",
  cancelled: "Törölve",
};

const STATUS_COLORS = {
  booked: "bg-slate-100 text-slate-700",
  scheduled: "bg-blue-100 text-blue-700",
  loaded: "bg-amber-100 text-amber-800",
  in_transit: "bg-indigo-100 text-indigo-800",
  customs: "bg-orange-100 text-orange-800",
  transit: "bg-cyan-100 text-cyan-800",
  arrived: "bg-teal-100 text-teal-800",
  arrived_onsite: "bg-lime-100 text-lime-800",
  arrived_offsite: "bg-green-100 text-green-700",
  closed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-700",
};

const fmt2 = (n) =>
  typeof n === "number" ? n.toLocaleString("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";

export default function OrderbookFamilyTree({ orders, lines }) {
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [search, setSearch] = useState("");

  const { data: trucks = [] } = useQuery({
    queryKey: ["all-trucks-family"],
    queryFn: () => base44.entities.Truck.list("-loading_date", 500),
    refetchInterval: 15000,
  });

  const orderIds = orders.map((o) => o.id);
  const relevantTrucks = trucks.filter((t) => orderIds.includes(t.orderbook_id));

  // Search logic - filter trucks and orders matching search term
  const searchLower = search.trim().toLowerCase();
  const matchingTruckIds = searchLower
    ? new Set(
        relevantTrucks
          .filter(
            (t) =>
              (t.truck_number && t.truck_number.toLowerCase().includes(searchLower)) ||
              (t.mrn_number && t.mrn_number.toLowerCase().includes(searchLower)) ||
              (t.orderbook_no && t.orderbook_no.toLowerCase().includes(searchLower))
          )
          .map((t) => t.id)
      )
    : null;

  const matchingOrderIds = searchLower
    ? new Set(
        orders
          .filter(
            (o) =>
              (o.order_no && o.order_no.toLowerCase().includes(searchLower)) ||
              (o.supplier_order_no && o.supplier_order_no.toLowerCase().includes(searchLower)) ||
              relevantTrucks.some(
                (t) =>
                  t.orderbook_id === o.id &&
                  ((t.truck_number && t.truck_number.toLowerCase().includes(searchLower)) ||
                    (t.mrn_number && t.mrn_number.toLowerCase().includes(searchLower)))
              )
          )
          .map((o) => o.id)
      )
    : null;

  const displayedOrders = searchLower
    ? orders.filter((o) => matchingOrderIds?.has(o.id))
    : orders;

  const toggle = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(displayedOrders.map((o) => o.id)));
  const collapseAll = () => setExpandedIds(new Set());

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Keresés: rendszám (ABC-123), MRN szám, rendelésszám..."
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2 text-xs">
            <button onClick={expandAll} className="text-blue-600 hover:underline">Mind kinyit</button>
            <span className="text-slate-300">|</span>
            <button onClick={collapseAll} className="text-slate-500 hover:underline">Mind becsuk</button>
          </div>
        </div>
        {searchLower && (
          <div className="mt-2 text-xs text-slate-500">
            {displayedOrders.length} rendelés · {relevantTrucks.filter((t) => matchingTruckIds?.has(t.id)).length} kamion találat
          </div>
        )}
      </Card>

      {/* Family tree */}
      {displayedOrders.length === 0 ? (
        <div className="text-center py-12 text-slate-400">Nincs találat</div>
      ) : (
        <div className="space-y-3">
          {displayedOrders.map((order) => {
            const orderLines = lines.filter((l) => l.orderbook_id === order.id);
            const orderTrucks = relevantTrucks.filter((t) => t.orderbook_id === order.id);
            const isExpanded = expandedIds.has(order.id);

            const filteredTrucks = searchLower && matchingTruckIds
              ? orderTrucks.filter((t) => matchingTruckIds.has(t.id))
              : orderTrucks;

            const plannedTons = orderLines.reduce((s, l) => s + (l.planned_quantity_tons || 0), 0);
            const orderValue = orderLines.reduce((s, l) => s + (l.line_value_eur || 0), 0);
            const truckClosed = orderTrucks.filter((t) => t.status === "closed").length;
            const totalDelivered = orderTrucks
              .filter((t) => t.status === "closed")
              .reduce((s, t) => s + (t.actual_weight_tons || t.planned_quantity_tons || 0), 0);

            return (
              <Card key={order.id} className="overflow-hidden border-slate-200">
                {/* Order header row */}
                <div
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    isExpanded ? "bg-blue-50 border-b border-blue-100" : "hover:bg-slate-50"
                  }`}
                  onClick={() => toggle(order.id)}
                >
                  <div className="text-slate-400">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                  <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 text-sm">
                        {order.supplier_order_no || order.order_no}
                      </span>
                      {order.supplier_order_no && (
                        <span className="text-xs text-slate-400">({order.order_no})</span>
                      )}
                      <Badge className={`text-[10px] px-1.5 py-0 ${
                        order.status === "open" ? "bg-blue-100 text-blue-700" :
                        order.status === "closed" ? "bg-emerald-100 text-emerald-800" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {order.status === "open" ? "Nyitott" : order.status === "closed" ? "Lezárt" : "Piszkozat"}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {order.supplier_name} · {order.supplier_site_name} · {order.order_date}
                    </div>
                  </div>

                  {/* Order summary pills */}
                  <div className="hidden md:flex items-center gap-3 text-xs flex-wrap justify-end">
                    <InfoPill label="Terméksorok" value={orderLines.length} />
                    <InfoPill label="Kamionok" value={orderTrucks.length} color="text-amber-700" />
                    <InfoPill label="Lezárt" value={truckClosed} color="text-emerald-700" />
                    <InfoPill label="Rendelt" value={`${fmt2(plannedTons)} t`} />
                    <InfoPill label="Szállított" value={`${fmt2(totalDelivered)} t`} color="text-blue-700" />
                    <InfoPill label="Érték" value={`${(orderValue / 1000).toFixed(1)}k EUR`} color="text-violet-700" />
                  </div>
                </div>

                {/* Expanded: lines + trucks */}
                {isExpanded && (
                  <div className="px-4 py-3 space-y-3 bg-white">
                    {/* Category lines */}
                    {orderLines.length > 0 && (
                      <div className="ml-7">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Terméksorok</div>
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50">
                              <tr className="text-slate-500 font-semibold">
                                <th className="text-left px-3 py-1.5">Kategória</th>
                                <th className="text-right px-3 py-1.5">Rendelt (t)</th>
                                <th className="text-right px-3 py-1.5">Ár (EUR/t)</th>
                                <th className="text-right px-3 py-1.5">Érték (EUR)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {orderLines.map((line) => (
                                <tr key={line.id} className="border-t">
                                  <td className="px-3 py-1.5 font-medium text-slate-700">{line.category_name}</td>
                                  <td className="px-3 py-1.5 text-right text-slate-700">{fmt2(line.planned_quantity_tons)}</td>
                                  <td className="px-3 py-1.5 text-right text-slate-500">{fmt2(line.unit_price_eur_per_ton)}</td>
                                  <td className="px-3 py-1.5 text-right font-semibold text-slate-800">{fmt2(line.line_value_eur)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Trucks */}
                    {filteredTrucks.length > 0 && (
                      <div className="ml-7">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                          Kamionok ({filteredTrucks.length})
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50">
                              <tr className="text-slate-500 font-semibold">
                                <th className="text-left px-3 py-1.5">Rendszám</th>
                                <th className="text-left px-3 py-1.5">Rakodás dátuma</th>
                                <th className="text-left px-3 py-1.5">Fuvarozó</th>
                                <th className="text-left px-3 py-1.5">Célállomás</th>
                                <th className="text-right px-3 py-1.5">Tervezett (t)</th>
                                <th className="text-right px-3 py-1.5">Tényleges (t)</th>
                                <th className="text-left px-3 py-1.5">MRN</th>
                                <th className="text-left px-3 py-1.5">Státusz</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredTrucks.map((truck, idx) => (
                                <tr
                                  key={truck.id}
                                  className={`border-t ${
                                    matchingTruckIds?.has(truck.id)
                                      ? "bg-yellow-50"
                                      : idx % 2 === 0
                                      ? ""
                                      : "bg-slate-50/40"
                                  }`}
                                >
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-1.5">
                                      <Truck className="w-3 h-3 text-slate-400" />
                                      <span className="font-semibold text-slate-800">
                                        {truck.truck_number || <span className="text-slate-400 italic">—</span>}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-slate-600">
                                    {truck.actual_loading_date || truck.expected_loading_date || truck.loading_date || "—"}
                                  </td>
                                  <td className="px-3 py-2 text-slate-600">{truck.carrier_name || "—"}</td>
                                  <td className="px-3 py-2 text-slate-600">
                                    {truck.destination_country}{truck.destination_city ? ` · ${truck.destination_city}` : ""}
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-700">{fmt2(truck.planned_quantity_tons)}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-blue-700">
                                    {truck.actual_weight_tons ? fmt2(truck.actual_weight_tons) : "—"}
                                  </td>
                                  <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">
                                    {truck.mrn_number || "—"}
                                  </td>
                                  <td className="px-3 py-2">
                                    <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[truck.status] || "bg-slate-100 text-slate-600"}`}>
                                      {STATUS_LABELS[truck.status] || truck.status}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            {filteredTrucks.length > 1 && (
                              <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-semibold text-slate-700">
                                <tr>
                                  <td colSpan={4} className="px-3 py-2 text-xs">ÖSSZESEN</td>
                                  <td className="px-3 py-2 text-right text-xs">
                                    {fmt2(filteredTrucks.reduce((s, t) => s + (t.planned_quantity_tons || 0), 0))} t
                                  </td>
                                  <td className="px-3 py-2 text-right text-xs text-blue-700">
                                    {fmt2(filteredTrucks.filter(t => t.status === "closed").reduce((s, t) => s + (t.actual_weight_tons || 0), 0))} t
                                  </td>
                                  <td colSpan={2}></td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      </div>
                    )}

                    {filteredTrucks.length === 0 && !searchLower && (
                      <div className="ml-7 text-xs text-slate-400 italic">Nincs hozzárendelt kamion</div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoPill({ label, value, color = "text-slate-700" }) {
  return (
    <div className="text-center">
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className={`font-bold ${color}`}>{value}</div>
    </div>
  );
}
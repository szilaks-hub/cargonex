import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrderbookDapCalc from "./OrderbookDapCalc";
import OrderbookReport from "./OrderbookReport";

const ACTIVE_STATUSES = ["booked", "scheduled", "loaded", "in_transit", "customs", "transit", "arrived", "arrived_onsite", "arrived_offsite"];

const fmt = (n) =>
  typeof n === "number"
    ? n.toLocaleString("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0,00";

const fmtInt = (n) =>
  typeof n === "number"
    ? n.toLocaleString("hu-HU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : "0";

const fmtEur = (n) => `${fmtInt(n)} EUR`;

function buildByCategory(filteredLines, activeTrucks, closedTrucks) {
  const map = {};
  const totalOrdered = filteredLines.reduce((s, l) => s + (l.planned_quantity_tons || 0), 0);
  const totalActiveWeight = activeTrucks.reduce((s, t) => s + (t.planned_quantity_tons || 0), 0);
  const totalDelivered = closedTrucks.reduce((s, t) => s + (t.actual_weight_tons || t.planned_quantity_tons || 0), 0);

  filteredLines.forEach(line => {
    const key = line.category_name || "Egyéb";
    if (!map[key]) {
      map[key] = { category: key, orderedTons: 0, orderValue: 0, prices: [], orderIds: new Set() };
    }
    map[key].orderedTons += line.planned_quantity_tons || 0;
    map[key].orderValue += line.line_value_eur || 0;
    if (line.unit_price_eur_per_ton) map[key].prices.push(line.unit_price_eur_per_ton);
    map[key].orderIds.add(line.orderbook_id);
  });

  return Object.values(map).map(cat => {
    const share = totalOrdered > 0 ? cat.orderedTons / totalOrdered : 0;
    const bookedTons = totalActiveWeight * share;
    const deliveredTons = totalDelivered * share;
    const freeTons = Math.max(0, cat.orderedTons - bookedTons - deliveredTons);
    const avgPrice = cat.prices.length > 0 ? cat.prices.reduce((a, b) => a + b, 0) / cat.prices.length : 0;
    return {
      ...cat,
      bookedTons, deliveredTons, freeTons,
      bookedValue: bookedTons * avgPrice,
      deliveredValue: deliveredTons * avgPrice,
      freeValue: freeTons * avgPrice,
      avgPrice,
      orderCount: cat.orderIds.size,
    };
  }).sort((a, b) => b.orderedTons - a.orderedTons);
}

function SummaryPanel({ title, orderIds, lines, trucks, allOrders, badge }) {
  const filteredLines = lines.filter(l => orderIds.includes(l.orderbook_id));
  const relevantTrucks = trucks.filter(t => orderIds.includes(t.orderbook_id));
  const activeTrucks = relevantTrucks.filter(t => ACTIVE_STATUSES.includes(t.status));
  const closedTrucks = relevantTrucks.filter(t => t.status === "closed");

  const byCategory = useMemo(
    () => buildByCategory(filteredLines, activeTrucks, closedTrucks),
    [filteredLines.length, activeTrucks.length, closedTrucks.length]
  );

  const totals = useMemo(() => byCategory.reduce((acc, c) => ({
    orderedTons: acc.orderedTons + c.orderedTons,
    orderValue: acc.orderValue + c.orderValue,
    bookedTons: acc.bookedTons + c.bookedTons,
    bookedValue: acc.bookedValue + c.bookedValue,
    deliveredTons: acc.deliveredTons + c.deliveredTons,
    deliveredValue: acc.deliveredValue + c.deliveredValue,
    freeTons: acc.freeTons + c.freeTons,
    freeValue: acc.freeValue + c.freeValue,
  }), { orderedTons: 0, orderValue: 0, bookedTons: 0, bookedValue: 0, deliveredTons: 0, deliveredValue: 0, freeTons: 0, freeValue: 0 }), [byCategory]);

  if (orderIds.length === 0) {
    return <div className="text-center py-16 text-slate-400">Nincs ide tartozó rendelés.</div>;
  }

  const filteredOrders = allOrders.filter(o => orderIds.includes(o.id));

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Összes rendelt" value={fmt(totals.orderedTons) + " t"} sub={fmtEur(totals.orderValue)} color="text-slate-800" bg="bg-slate-50" border="border-slate-200" />
        <KpiCard label="Előjegyzett (kamionon)" value={fmt(totals.bookedTons) + " t"} sub={fmtEur(totals.bookedValue)} color="text-amber-700" bg="bg-amber-50" border="border-amber-200" />
        <KpiCard label="Felvehető / Szabad" value={fmt(totals.freeTons) + " t"} sub={fmtEur(totals.freeValue)} color="text-emerald-700" bg="bg-emerald-50" border="border-emerald-200" />
        <KpiCard label="Leszállított" value={fmt(totals.deliveredTons) + " t"} sub={fmtEur(totals.deliveredValue)} color="text-blue-700" bg="bg-blue-50" border="border-blue-200" />
      </div>

      {/* Category table */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-sm">{title} – Termékcsoportonkénti összesítő</h3>
            <p className="text-slate-400 text-xs mt-0.5">{orderIds.length} db rendelés</p>
          </div>
          <Badge className="bg-slate-600 text-slate-200 text-xs">{byCategory.length} termékcsoport</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left px-4 py-2.5 text-slate-500 font-semibold">Termékcsoport</th>
                <th className="text-center px-3 py-2.5 text-slate-500 font-semibold">Rendelések</th>
                <th className="text-right px-4 py-2.5 text-slate-500 font-semibold">Rendelt (t)</th>
                <th className="text-right px-4 py-2.5 text-slate-500 font-semibold">Rendelt érték</th>
                <th className="text-right px-4 py-2.5 text-slate-500 font-semibold">Átlag ár (EUR/t)</th>
                <th className="text-right px-4 py-2.5 text-amber-600 font-semibold">Előjegyzett (t)</th>
                <th className="text-right px-4 py-2.5 text-amber-600 font-semibold">Előj. érték</th>
                <th className="text-right px-4 py-2.5 text-emerald-600 font-semibold">Szabad (t)</th>
                <th className="text-right px-4 py-2.5 text-emerald-600 font-semibold">Szabad érték</th>
                <th className="text-right px-4 py-2.5 text-blue-600 font-semibold">Szállított (t)</th>
                <th className="text-right px-4 py-2.5 text-slate-400 font-semibold">%</th>
              </tr>
            </thead>
            <tbody>
              {byCategory.map((cat, i) => {
                const pct = cat.orderedTons > 0 ? Math.round(((cat.bookedTons + cat.deliveredTons) / cat.orderedTons) * 100) : 0;
                return (
                  <tr key={cat.category} className={`border-b hover:bg-slate-50 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/40"}`}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{cat.category}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">{cat.orderCount}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(cat.orderedTons)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmtEur(cat.orderValue)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{fmt(cat.avgPrice)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-700">{fmt(cat.bookedTons)}</td>
                    <td className="px-4 py-3 text-right text-amber-600">{fmtEur(cat.bookedValue)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{fmt(cat.freeTons)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{fmtEur(cat.freeValue)}</td>
                    <td className="px-4 py-3 text-right text-blue-700 font-semibold">{fmt(cat.deliveredTons)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-blue-500" : pct >= 30 ? "bg-amber-400" : "bg-slate-300"}`}
                            style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className={`font-bold text-[10px] w-7 text-right ${pct >= 100 ? "text-emerald-600" : pct >= 70 ? "text-blue-600" : "text-amber-600"}`}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800">
                <td className="px-4 py-3 text-xs uppercase tracking-wide">ÖSSZESEN</td>
                <td className="px-3 py-3 text-center text-slate-500 text-xs">{orderIds.length}</td>
                <td className="px-4 py-3 text-right">{fmt(totals.orderedTons)} t</td>
                <td className="px-4 py-3 text-right text-sm">{fmtEur(totals.orderValue)}</td>
                <td className="px-4 py-3 text-right text-slate-400">—</td>
                <td className="px-4 py-3 text-right text-amber-700">{fmt(totals.bookedTons)} t</td>
                <td className="px-4 py-3 text-right text-amber-700">{fmtEur(totals.bookedValue)}</td>
                <td className="px-4 py-3 text-right text-emerald-700">{fmt(totals.freeTons)} t</td>
                <td className="px-4 py-3 text-right text-emerald-700">{fmtEur(totals.freeValue)}</td>
                <td className="px-4 py-3 text-right text-blue-700">{fmt(totals.deliveredTons)} t</td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="border-t px-5 py-3 bg-slate-50 flex items-center gap-6 flex-wrap">
          <ProgressLegendItem color="bg-amber-400" label="Előjegyzett" tons={totals.bookedTons} total={totals.orderedTons} />
          <ProgressLegendItem color="bg-emerald-500" label="Szabad" tons={totals.freeTons} total={totals.orderedTons} />
          <ProgressLegendItem color="bg-blue-500" label="Szállított" tons={totals.deliveredTons} total={totals.orderedTons} />
          <div className="ml-auto text-xs text-slate-400">Utoljára frissítve: {new Date().toLocaleTimeString("hu-HU")}</div>
        </div>
      </Card>

      {/* DAP Calculator */}
      <OrderbookDapCalc byCategory={byCategory} trucks={trucks} orderIds={orderIds} />

      {/* Detailed report */}
      <OrderbookReport orders={filteredOrders} lines={filteredLines} trucks={relevantTrucks} title={title} />
    </div>
  );
}

export default function OrderbooksMasterSummary({ orders, lines }) {
  const [summaryTab, setSummaryTab] = useState("open");

  const openOrderIds = orders.filter(o => o.status === "open").map(o => o.id);
  const closedOrderIds = orders.filter(o => o.status === "closed").map(o => o.id);

  const { data: trucks = [] } = useQuery({
    queryKey: ["all-trucks-summary"],
    queryFn: () => base44.entities.Truck.list("-created_date", 1000),
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-4">
      <Tabs value={summaryTab} onValueChange={setSummaryTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="open">📂 Nyitott rendelések ({openOrderIds.length})</TabsTrigger>
          <TabsTrigger value="closed">✅ Lezárt rendelések ({closedOrderIds.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4">
          <SummaryPanel
            title="Nyitott"
            orderIds={openOrderIds}
            lines={lines}
            trucks={trucks}
            allOrders={orders}
            badge="Nyitott"
          />
        </TabsContent>

        <TabsContent value="closed" className="mt-4">
          <SummaryPanel
            title="Lezárt"
            orderIds={closedOrderIds}
            lines={lines}
            trucks={trucks}
            allOrders={orders}
            badge="Lezárt"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ label, value, sub, color, bg, border }) {
  return (
    <Card className={`p-4 ${bg} border ${border}`}>
      <div className="text-xs text-slate-500 font-medium">{label}</div>
      <div className={`text-xl font-bold mt-1 ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
    </Card>
  );
}

function ProgressLegendItem({ color, label, tons, total }) {
  const pct = total > 0 ? Math.round((tons / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs text-slate-600">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span>{label}</span>
      <span className="font-semibold text-slate-800">{fmt(tons)} t</span>
      <span className="text-slate-400">({pct}%)</span>
    </div>
  );
}
import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FileText, Printer, TrendingUp } from "lucide-react";

const fmt = (n, d = 2) =>
  typeof n === "number"
    ? n.toLocaleString("hu-HU", { minimumFractionDigits: d, maximumFractionDigits: d })
    : "—";
const fmtEur = (n) => (typeof n === "number" ? `${fmt(n, 0)} EUR` : "—");

const STATUS_HU = {
  booked: "Előjegyzett", scheduled: "Ütemezett", loaded: "Megrakott",
  in_transit: "Úton", customs: "Vámon", transit: "Transit",
  arrived: "Megérkezett", arrived_onsite: "Helyszínen", arrived_offsite: "Átmeneti",
  closed: "Lezárt", cancelled: "Törölve",
};
const STATUS_COLOR = {
  booked: "bg-slate-100 text-slate-700", scheduled: "bg-slate-100 text-slate-700",
  loaded: "bg-amber-100 text-amber-800", in_transit: "bg-blue-100 text-blue-800",
  customs: "bg-orange-100 text-orange-800", transit: "bg-blue-100 text-blue-700",
  arrived: "bg-teal-100 text-teal-800", arrived_onsite: "bg-teal-100 text-teal-800",
  arrived_offsite: "bg-teal-100 text-teal-700", closed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

export default function OrderbookReport({ orders, lines, trucks, title }) {
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const reportData = useMemo(() => {
    return orders.map(order => {
      const orderLines = lines.filter(l => l.orderbook_id === order.id);
      const orderTrucks = trucks.filter(t => t.orderbook_id === order.id && t.status !== "cancelled");

      const plannedTons = orderLines.reduce((s, l) => s + (l.planned_quantity_tons || 0), 0);
      const orderValueEur = orderLines.reduce((s, l) => s + (l.line_value_eur || 0), 0);

      const closedTrucks = orderTrucks.filter(t => t.status === "closed");
      const activeTrucks = orderTrucks.filter(t => t.status !== "closed");

      const deliveredTons = closedTrucks.reduce((s, t) => s + (t.actual_weight_tons || t.planned_quantity_tons || 0), 0);
      const inTransitTons = activeTrucks.reduce((s, t) => s + (t.planned_quantity_tons || 0), 0);

      // Freight costs — only from trucks with snapshot data
      const trucksWithFreight = orderTrucks.filter(t => t.freight_total_snapshot > 0 || t.freight_eur_per_ton_snapshot > 0);
      const totalFreightEur = trucksWithFreight.reduce((s, t) => {
        if (t.freight_total_snapshot > 0) return s + t.freight_total_snapshot;
        const tons = t.actual_weight_tons || t.planned_quantity_tons || 0;
        return s + (t.freight_eur_per_ton_snapshot || 0) * tons;
      }, 0);

      // Customs costs — per truck fee
      const trucksWithCustoms = orderTrucks.filter(t => t.customs_agent_fee > 0);
      const totalCustomsEur = trucksWithCustoms.reduce((s, t) => s + (t.customs_agent_fee || 0), 0);

      // Other fees from orderbook
      const otherFeesEur = (order.customs_fee_eur_per_truck || 0) * orderTrucks.length
        + (order.other_fees || []).reduce((s, f) => s + (f.fee_eur_per_truck || 0) * orderTrucks.length, 0);

      const totalCostEur = orderValueEur + totalFreightEur + totalCustomsEur + otherFeesEur;
      const avgFreightPerTon = deliveredTons > 0 ? totalFreightEur / deliveredTons : 0;
      const avgCustomsPerTon = deliveredTons > 0 ? totalCustomsEur / deliveredTons : 0;
      const dapPriceEurTon = deliveredTons > 0 ? totalCostEur / deliveredTons : 0;
      const avgPurchasePerTon = orderLines.length > 0
        ? orderLines.reduce((s, l) => s + (l.unit_price_eur_per_ton || 0), 0) / orderLines.filter(l => l.unit_price_eur_per_ton).length || 0
        : 0;

      const pct = plannedTons > 0 ? Math.round((deliveredTons / plannedTons) * 100) : 0;
      const freeTons = Math.max(0, plannedTons - deliveredTons - inTransitTons);

      return {
        order, orderLines, orderTrucks, closedTrucks, activeTrucks,
        plannedTons, orderValueEur, deliveredTons, inTransitTons, freeTons,
        totalFreightEur, totalCustomsEur, otherFeesEur, totalCostEur,
        avgFreightPerTon, avgCustomsPerTon, dapPriceEurTon, avgPurchasePerTon,
        pct, truckCount: orderTrucks.length,
      };
    }).sort((a, b) => new Date(b.order.order_date) - new Date(a.order.order_date));
  }, [orders, lines, trucks]);

  const grandTotals = useMemo(() => reportData.reduce((acc, r) => ({
    plannedTons: acc.plannedTons + r.plannedTons,
    orderValueEur: acc.orderValueEur + r.orderValueEur,
    deliveredTons: acc.deliveredTons + r.deliveredTons,
    totalFreightEur: acc.totalFreightEur + r.totalFreightEur,
    totalCustomsEur: acc.totalCustomsEur + r.totalCustomsEur,
    otherFeesEur: acc.otherFeesEur + r.otherFeesEur,
    totalCostEur: acc.totalCostEur + r.totalCostEur,
    truckCount: acc.truckCount + r.truckCount,
  }), { plannedTons: 0, orderValueEur: 0, deliveredTons: 0, totalFreightEur: 0, totalCustomsEur: 0, otherFeesEur: 0, totalCostEur: 0, truckCount: 0 }), [reportData]);

  const displayed = showAll ? reportData : reportData.slice(0, 10);

  if (orders.length === 0) return null;

  return (
    <Card className="overflow-hidden border-indigo-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 px-5 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-indigo-300" />
          <div>
            <h3 className="font-bold text-white text-sm">{title} – Részletes rendelési riport</h3>
            <p className="text-indigo-300 text-xs mt-0.5">Rendelésenkénti teljes költségelemzés · összes fuvarköltség és vám</p>
          </div>
        </div>
        <Badge className="bg-indigo-600 text-indigo-100 text-xs">{orders.length} rendelés</Badge>
      </div>

      {/* Grand totals bar */}
      <div className="bg-indigo-50 border-b border-indigo-100 px-5 py-3 flex flex-wrap gap-5 text-xs">
        <GrandTotalItem label="Összes rendelt" value={fmt(grandTotals.plannedTons) + " t"} />
        <GrandTotalItem label="Leszállított" value={fmt(grandTotals.deliveredTons) + " t"} highlight="text-blue-700" />
        <GrandTotalItem label="Besz. érték" value={fmtEur(grandTotals.orderValueEur)} />
        <GrandTotalItem label="Össz. fuvardíj" value={fmtEur(grandTotals.totalFreightEur)} highlight="text-blue-700" />
        <GrandTotalItem label="Össz. vám" value={fmtEur(grandTotals.totalCustomsEur)} highlight="text-orange-700" />
        <GrandTotalItem label="ÖSSZES BEKERÜLÉSI ÉRTÉK" value={fmtEur(grandTotals.totalCostEur)} highlight="text-indigo-800 font-bold text-sm" />
        <GrandTotalItem label="Kamionok" value={grandTotals.truckCount + " db"} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b text-slate-500">
              <th className="text-left px-4 py-2.5 font-semibold w-6"></th>
              <th className="text-left px-4 py-2.5 font-semibold">Rendelésszám</th>
              <th className="text-left px-4 py-2.5 font-semibold">Beszállító</th>
              <th className="text-left px-4 py-2.5 font-semibold">Dátum</th>
              <th className="text-right px-4 py-2.5 font-semibold">Rendelt (t)</th>
              <th className="text-right px-4 py-2.5 font-semibold">Szállított (t)</th>
              <th className="text-right px-4 py-2.5 font-semibold">Besz. ár (EUR)</th>
              <th className="text-right px-4 py-2.5 text-blue-600 font-semibold">Fuvardíj (EUR)</th>
              <th className="text-right px-4 py-2.5 text-orange-600 font-semibold">Vám (EUR)</th>
              <th className="text-right px-4 py-2.5 text-slate-500 font-semibold">Egyéb (EUR)</th>
              <th className="text-right px-4 py-2.5 text-indigo-700 font-semibold">Összes ktg.</th>
              <th className="text-right px-4 py-2.5 text-indigo-700 font-semibold">DAP EUR/t</th>
              <th className="text-center px-3 py-2.5 font-semibold">Kamion</th>
              <th className="text-right px-3 py-2.5 font-semibold">%</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((r, i) => {
              const isExpanded = expandedOrder === r.order.id;
              return (
                <React.Fragment key={r.order.id}>
                  <tr
                    className={`border-b hover:bg-indigo-50/30 cursor-pointer transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/30"} ${isExpanded ? "bg-indigo-50" : ""}`}
                    onClick={() => setExpandedOrder(isExpanded ? null : r.order.id)}
                  >
                    <td className="px-4 py-3 text-slate-400">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{r.order.supplier_order_no || r.order.order_no}</div>
                      <div className="text-[10px] text-slate-400">{r.order.order_no}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="font-medium">{r.order.supplier_name || "—"}</div>
                      <div className="text-[10px] text-slate-400">{r.order.supplier_site_name}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.order.order_date}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(r.plannedTons)}</td>
                    <td className="px-4 py-3 text-right text-blue-700 font-semibold">{fmt(r.deliveredTons)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmt(r.orderValueEur, 0)}</td>
                    <td className="px-4 py-3 text-right text-blue-700">
                      {r.totalFreightEur > 0 ? fmt(r.totalFreightEur, 0) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-orange-700">
                      {r.totalCustomsEur > 0 ? fmt(r.totalCustomsEur, 0) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {r.otherFeesEur > 0 ? fmt(r.otherFeesEur, 0) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded">
                        {fmt(r.totalCostEur, 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.dapPriceEurTon > 0
                        ? <span className="font-bold text-indigo-700">{fmt(r.dapPriceEurTon)} EUR/t</span>
                        : <span className="text-slate-300 text-[10px]">—</span>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-semibold text-slate-700">{r.truckCount}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${r.pct >= 100 ? "bg-emerald-500" : r.pct >= 70 ? "bg-blue-500" : "bg-amber-400"}`}
                            style={{ width: `${Math.min(r.pct, 100)}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 w-7 text-right">{r.pct}%</span>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail: truck list */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={14} className="bg-indigo-50/60 border-b border-indigo-100 px-4 py-4">
                        <div className="space-y-3">
                          {/* Order lines */}
                          <div>
                            <div className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide mb-2">Rendelési sorok</div>
                            <div className="flex flex-wrap gap-2">
                              {r.orderLines.map(l => (
                                <div key={l.id} className="bg-white border border-indigo-100 rounded-lg px-3 py-2 text-xs">
                                  <div className="font-semibold text-slate-800">{l.category_name}</div>
                                  <div className="text-slate-500">{fmt(l.planned_quantity_tons)} t · {fmt(l.unit_price_eur_per_ton)} EUR/t</div>
                                  <div className="text-indigo-700 font-semibold">{fmt(l.line_value_eur, 0)} EUR</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Cost breakdown */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <CostBreakdownCard label="Besz. ár összesen" value={fmtEur(r.orderValueEur)} sub={`Átlag: ${fmt(r.avgPurchasePerTon)} EUR/t`} color="bg-white" />
                            <CostBreakdownCard label="Fuvardíj összesen" value={fmtEur(r.totalFreightEur)} sub={r.deliveredTons > 0 ? `≈ ${fmt(r.avgFreightPerTon)} EUR/t` : "Nincs adat"} color="bg-blue-50" textColor="text-blue-800" />
                            <CostBreakdownCard label="Vámkezelés összesen" value={fmtEur(r.totalCustomsEur)} sub={r.deliveredTons > 0 ? `≈ ${fmt(r.avgCustomsPerTon)} EUR/t` : "Nincs adat"} color="bg-orange-50" textColor="text-orange-800" />
                            <CostBreakdownCard label="DAP ár (szállított)" value={r.dapPriceEurTon > 0 ? `${fmt(r.dapPriceEurTon)} EUR/t` : "—"} sub={`Összes: ${fmtEur(r.totalCostEur)}`} color="bg-indigo-50" textColor="text-indigo-800" />
                          </div>

                          {/* Trucks */}
                          {r.orderTrucks.length > 0 && (
                            <div>
                              <div className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide mb-2">Kamionok ({r.orderTrucks.length} db)</div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-[11px] bg-white rounded-lg border border-indigo-100">
                                  <thead>
                                    <tr className="bg-slate-50 border-b text-slate-500 text-[10px]">
                                      <th className="text-left px-3 py-2">Rendszám</th>
                                      <th className="text-left px-3 py-2">Rakodás</th>
                                      <th className="text-left px-3 py-2">MRN</th>
                                      <th className="text-left px-3 py-2">Fuvarozó</th>
                                      <th className="text-left px-3 py-2">Célállomás</th>
                                      <th className="text-right px-3 py-2">Tervezett (t)</th>
                                      <th className="text-right px-3 py-2">Tényleges (t)</th>
                                      <th className="text-right px-3 py-2 text-blue-600">Fuvardíj</th>
                                      <th className="text-right px-3 py-2 text-orange-600">Vám</th>
                                      <th className="text-center px-3 py-2">Státusz</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {r.orderTrucks.map(t => {
                                      const truckFreight = t.freight_total_snapshot > 0
                                        ? t.freight_total_snapshot
                                        : t.freight_eur_per_ton_snapshot > 0
                                          ? t.freight_eur_per_ton_snapshot * (t.actual_weight_tons || t.planned_quantity_tons || 0)
                                          : null;
                                      return (
                                        <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50">
                                          <td className="px-3 py-2 font-semibold text-slate-800">{t.truck_number || <span className="text-slate-300 italic">—</span>}</td>
                                          <td className="px-3 py-2 text-slate-600">{t.actual_loading_date || t.expected_loading_date || t.loading_date || "—"}</td>
                                          <td className="px-3 py-2 text-slate-500">{t.mrn_number || "—"}</td>
                                          <td className="px-3 py-2 text-slate-600">{t.carrier_name || "—"}</td>
                                          <td className="px-3 py-2 text-slate-500">{t.destination_country}{t.destination_city ? ` · ${t.destination_city}` : ""}</td>
                                          <td className="px-3 py-2 text-right text-slate-700">{fmt(t.planned_quantity_tons)}</td>
                                          <td className="px-3 py-2 text-right font-semibold text-blue-700">{t.actual_weight_tons ? fmt(t.actual_weight_tons) : <span className="text-slate-300">—</span>}</td>
                                          <td className="px-3 py-2 text-right text-blue-700">
                                            {truckFreight != null ? `${fmt(truckFreight, 0)} EUR` : <span className="text-slate-300">—</span>}
                                          </td>
                                          <td className="px-3 py-2 text-right text-orange-700">
                                            {t.customs_agent_fee > 0 ? `${fmt(t.customs_agent_fee, 0)} EUR` : <span className="text-slate-300">—</span>}
                                          </td>
                                          <td className="px-3 py-2 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLOR[t.status] || "bg-slate-100 text-slate-600"}`}>
                                              {STATUS_HU[t.status] || t.status}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-indigo-100 border-t-2 border-indigo-300 font-bold text-indigo-900">
              <td className="px-4 py-3" colSpan={4}>ÖSSZESEN ({orders.length} rendelés)</td>
              <td className="px-4 py-3 text-right">{fmt(grandTotals.plannedTons)} t</td>
              <td className="px-4 py-3 text-right">{fmt(grandTotals.deliveredTons)} t</td>
              <td className="px-4 py-3 text-right">{fmt(grandTotals.orderValueEur, 0)}</td>
              <td className="px-4 py-3 text-right text-blue-800">{fmt(grandTotals.totalFreightEur, 0)}</td>
              <td className="px-4 py-3 text-right text-orange-800">{fmt(grandTotals.totalCustomsEur, 0)}</td>
              <td className="px-4 py-3 text-right">{fmt(grandTotals.otherFeesEur, 0)}</td>
              <td className="px-4 py-3 text-right text-indigo-900 text-sm">{fmt(grandTotals.totalCostEur, 0)} EUR</td>
              <td className="px-4 py-3 text-right text-indigo-700 text-xs">
                {grandTotals.deliveredTons > 0 ? `Átlag: ${fmt(grandTotals.totalCostEur / grandTotals.deliveredTons)} EUR/t` : "—"}
              </td>
              <td className="px-3 py-3 text-center">{grandTotals.truckCount}</td>
              <td className="px-3 py-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {reportData.length > 10 && (
        <div className="border-t px-5 py-3 bg-slate-50 text-center">
          <Button size="sm" variant="outline" onClick={() => setShowAll(!showAll)} className="text-xs">
            {showAll ? "Kevesebb" : `Összes megjelenítése (${reportData.length} db)`}
          </Button>
        </div>
      )}
    </Card>
  );
}

function GrandTotalItem({ label, value, highlight }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-indigo-500 uppercase tracking-wide">{label}</span>
      <span className={`font-bold text-slate-800 ${highlight || ""}`}>{value}</span>
    </div>
  );
}

function CostBreakdownCard({ label, value, sub, color, textColor }) {
  return (
    <div className={`rounded-lg border border-slate-200 px-3 py-2 ${color || "bg-white"}`}>
      <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">{label}</div>
      <div className={`text-sm font-bold mt-0.5 ${textColor || "text-slate-800"}`}>{value}</div>
      <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}
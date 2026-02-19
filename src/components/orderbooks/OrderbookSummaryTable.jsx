import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";

const fmt = (n) =>
  typeof n === "number"
    ? n.toLocaleString("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";

const fmtEur = (n, currency = "EUR") =>
  typeof n === "number"
    ? `${n.toLocaleString("hu-HU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`
    : `— ${currency}`;

export default function OrderbookSummaryTable({ lines, orderbookId, currency = "EUR" }) {
  const { data: trucks = [] } = useQuery({
    queryKey: ["orderbook-trucks", orderbookId],
    queryFn: () => base44.entities.Truck.filter({ orderbook_id: orderbookId }, "-created_date"),
    enabled: !!orderbookId,
    refetchInterval: 10000,
  });

  // Closed trucks: actual weight
  const closedTrucks = trucks.filter((t) => t.status === "closed");
  const totalDelivered = closedTrucks.reduce(
    (s, t) => s + (t.actual_weight_tons || t.planned_quantity_tons || 0),
    0
  );

  // Totals from order lines
  const totalOrdered = lines.reduce((s, l) => s + (l.planned_quantity_tons || 0), 0);
  const totalOrderValue = lines.reduce((s, l) => s + (l.line_value_eur || 0), 0);

  // Planned allocated = sum of allocated_quantity_tons on lines (kept up-to-date by automation)
  const totalPlannedAllocated = lines.reduce((s, l) => s + (l.allocated_quantity_tons || 0), 0);

  // Average price/ton (weighted)
  const avgPrice = totalOrdered > 0 ? totalOrderValue / totalOrdered : 0;

  // Invoice value = delivered tons × price per line
  const totalInvoiceValue = lines.reduce((s, l) => {
    // Approximate per-line delivered as proportional to allocated
    const deliveredForLine = totalOrdered > 0
      ? totalDelivered * ((l.planned_quantity_tons || 0) / totalOrdered)
      : 0;
    return s + deliveredForLine * (l.unit_price_eur_per_ton || 0);
  }, 0);

  // Free = ordered - planned allocated (allocated already includes delivered)
  const totalFree = Math.max(0, totalOrdered - totalPlannedAllocated);
  const totalFreeValue = totalFree * avgPrice;
  const totalPlannedValue = totalPlannedAllocated * avgPrice;

  return (
    <Card className="overflow-hidden border-blue-200">
      {/* Title bar */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5">
        <h3 className="font-semibold text-white text-sm">Összesítő / Summary</h3>
      </div>

      {/* Per-line table */}
      {lines.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b text-slate-500 font-semibold">
                <th className="text-left px-3 py-2">Termék / Kategória</th>
                <th className="text-right px-3 py-2">Rendelt (t)</th>
                <th className="text-right px-3 py-2">Rendelt érték</th>
                <th className="text-right px-3 py-2">Ár / t</th>
                <th className="text-right px-3 py-2">Tervezett rakodás (t)</th>
                <th className="text-right px-3 py-2">Tervezett érték</th>
                <th className="text-right px-3 py-2">Szabad (t)</th>
                <th className="text-right px-3 py-2">Szállított (t)</th>
                <th className="text-right px-3 py-2">Számla érték</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const allocated = line.allocated_quantity_tons || 0;
                const free = Math.max(0, (line.planned_quantity_tons || 0) - allocated);
                // Estimate per-line delivered proportionally
                const deliveredLine = totalOrdered > 0
                  ? totalDelivered * ((line.planned_quantity_tons || 0) / totalOrdered)
                  : 0;
                const invoiceLine = deliveredLine * (line.unit_price_eur_per_ton || 0);
                const plannedValue = allocated * (line.unit_price_eur_per_ton || 0);
                const orderValue = (line.planned_quantity_tons || 0) * (line.unit_price_eur_per_ton || 0);

                return (
                  <tr key={line.id} className="border-b hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800">{line.category_name}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{fmt(line.planned_quantity_tons)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-800">
                      {fmtEur(orderValue, currency)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {fmtEur(line.unit_price_eur_per_ton, currency)}
                    </td>
                    <td className="px-3 py-2 text-right text-amber-700 font-semibold">
                      {fmt(allocated)}
                    </td>
                    <td className="px-3 py-2 text-right text-amber-700">
                      {fmtEur(plannedValue, currency)}
                    </td>
                    <td className={`px-3 py-2 text-right font-semibold ${free > 0 ? "text-emerald-700" : "text-slate-400"}`}>
                      {fmt(free)}
                    </td>
                    <td className="px-3 py-2 text-right text-blue-700 font-semibold">
                      {fmt(deliveredLine)}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-blue-800">
                      {fmtEur(invoiceLine, currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold text-slate-800 border-t-2 border-slate-300">
                <td className="px-3 py-2.5 text-xs">ÖSSZESEN</td>
                <td className="px-3 py-2.5 text-right text-xs">{fmt(totalOrdered)} t</td>
                <td className="px-3 py-2.5 text-right text-xs">{fmtEur(totalOrderValue, currency)}</td>
                <td className="px-3 py-2.5 text-right text-xs text-slate-400">—</td>
                <td className="px-3 py-2.5 text-right text-xs text-amber-700">{fmt(totalPlannedAllocated)} t</td>
                <td className="px-3 py-2.5 text-right text-xs text-amber-700">{fmtEur(totalPlannedValue, currency)}</td>
                <td className={`px-3 py-2.5 text-right text-xs ${totalFree > 0 ? "text-emerald-700" : "text-slate-400"}`}>
                  {fmt(totalFree)} t
                </td>
                <td className="px-3 py-2.5 text-right text-xs text-blue-700">{fmt(totalDelivered)} t</td>
                <td className="px-3 py-2.5 text-right text-xs text-blue-800">{fmtEur(totalInvoiceValue, currency)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* 4 summary boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-t">
        <SummaryBox
          label="Teljes rendelt érték"
          value={fmtEur(totalOrderValue, currency)}
          sub={`${fmt(totalOrdered)} t`}
          color="text-slate-900"
          bg="bg-white"
        />
        <SummaryBox
          label="Tervezett rakodáson"
          value={fmtEur(totalPlannedValue, currency)}
          sub={`${fmt(totalPlannedAllocated)} t`}
          color="text-amber-700"
          bg="bg-amber-50"
        />
        <SummaryBox
          label="Szabad (fogható)"
          value={fmtEur(totalFreeValue, currency)}
          sub={`${fmt(totalFree)} t`}
          color={totalFree > 0 ? "text-emerald-700" : "text-slate-400"}
          bg="bg-emerald-50"
        />
        <SummaryBox
          label="Számla végösszeg"
          value={fmtEur(totalInvoiceValue, currency)}
          sub={`${fmt(totalDelivered)} t szállítva`}
          color="text-blue-700"
          bg="bg-blue-50"
        />
      </div>
    </Card>
  );
}

function SummaryBox({ label, value, sub, color, bg = "bg-white" }) {
  return (
    <div className={`px-4 py-3 border-r last:border-r-0 ${bg}`}>
      <div className="text-[11px] text-slate-500 mb-0.5">{label}</div>
      <div className={`text-sm font-bold leading-tight ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}
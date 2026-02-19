import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";

const fmt = (n) => n?.toLocaleString("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "—";
const fmtEur = (n) => n?.toLocaleString("hu-HU", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) ?? "—";

export default function OrderbookSummaryTable({ lines, orderbookId, currency = "EUR" }) {
  const { data: trucks = [] } = useQuery({
    queryKey: ["orderbook-trucks", orderbookId],
    queryFn: () => base44.entities.Truck.filter({ orderbook_id: orderbookId }, "-created_date"),
    enabled: !!orderbookId,
    refetchInterval: 10000,
  });

  // Aggregate per category line
  const summaryRows = lines.map((line) => {
    const lineTrucks = trucks.filter((t) => {
      // Match trucks that contain this category in items, or use product_id matching category
      if (t.items && t.items.length > 0) {
        return t.items.some((item) => item.category_id === line.category_id || item.orderbook_line_id === line.id);
      }
      // fallback: all trucks under this orderbook count toward first line if no items
      return false;
    });

    // Trucks waiting to be loaded (booked, scheduled)
    const waitingTrucks = trucks.filter((t) => ["booked", "scheduled"].includes(t.status));
    const waitingTons = waitingTrucks.reduce((s, t) => s + (t.planned_quantity_tons || 0), 0);

    // Planned (allocated) = booked/loaded/in-transit (not closed/cancelled)
    const activeTrucks = trucks.filter((t) => !["closed", "cancelled"].includes(t.status));
    const plannedAllocatedTons = activeTrucks.reduce((s, t) => s + (t.planned_quantity_tons || 0), 0);

    // Closed: actual weight (or planned if no actual)
    const closedTrucks = trucks.filter((t) => t.status === "closed");
    const deliveredTons = closedTrucks.reduce((s, t) => s + (t.actual_weight_tons || t.planned_quantity_tons || 0), 0);
    const invoiceValue = closedTrucks.reduce((s, t) => {
      const weight = t.actual_weight_tons || t.planned_quantity_tons || 0;
      return s + weight * (line.unit_price_eur_per_ton || 0);
    }, 0);

    return {
      ...line,
      plannedAllocatedTons,
      waitingTons,
      deliveredTons,
      invoiceValue,
    };
  });

  // Totals across all lines
  const totalOrdered = lines.reduce((s, l) => s + (l.planned_quantity_tons || 0), 0);
  const totalOrderValue = lines.reduce((s, l) => s + (l.line_value_eur || 0), 0);

  // All trucks for this order
  const activeTrucks = trucks.filter((t) => !["closed", "cancelled"].includes(t.status));
  const totalPlannedAllocated = activeTrucks.reduce((s, t) => s + (t.planned_quantity_tons || 0), 0);

  const closedTrucks = trucks.filter((t) => t.status === "closed");
  const totalDelivered = closedTrucks.reduce((s, t) => s + (t.actual_weight_tons || t.planned_quantity_tons || 0), 0);

  // Average price per ton across lines (weighted)
  const avgPricePerTon = totalOrdered > 0 ? totalOrderValue / totalOrdered : 0;
  const totalInvoiceValue = totalDelivered * avgPricePerTon;

  // Free remaining (ordered - planned allocated - delivered)
  const totalFree = Math.max(0, totalOrdered - totalPlannedAllocated - totalDelivered);

  const waitingTrucksAll = trucks.filter((t) => ["booked", "scheduled"].includes(t.status));
  const totalWaiting = waitingTrucksAll.reduce((s, t) => s + (t.planned_quantity_tons || 0), 0);
  const totalWaitingValue = totalWaiting * avgPricePerTon;
  const totalFreeValue = totalFree * avgPricePerTon;

  return (
    <Card className="overflow-hidden border-blue-200">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5">
        <h3 className="font-semibold text-white text-sm">Összesítő / Summary</h3>
      </div>

      {/* Per-line breakdown */}
      {lines.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b text-slate-500 font-semibold">
                <th className="text-left px-3 py-2">Termék / Kategória</th>
                <th className="text-right px-3 py-2">Rendelt (t)</th>
                <th className="text-right px-3 py-2">Rendelt érték</th>
                <th className="text-right px-3 py-2">Tervezett rakodás (t)</th>
                <th className="text-right px-3 py-2">Tervezett érték</th>
                <th className="text-right px-3 py-2">Szabad (t)</th>
                <th className="text-right px-3 py-2">Szállított (t)</th>
                <th className="text-right px-3 py-2">Számla érték</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const linePlannedAllocated = activeTrucks.reduce((s, t) => s + (t.planned_quantity_tons || 0), 0);
                const lineDelivered = closedTrucks.reduce((s, t) => s + (t.actual_weight_tons || t.planned_quantity_tons || 0), 0);
                const lineFree = Math.max(0, (line.planned_quantity_tons || 0) - (line.allocated_quantity_tons || 0));
                const lineInvoice = lineDelivered * (line.unit_price_eur_per_ton || 0);

                return (
                  <tr key={line.id} className="border-b hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800">{line.category_name}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{fmt(line.planned_quantity_tons)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-800">
                      {fmtEur(line.line_value_eur)} {currency}
                    </td>
                    <td className="px-3 py-2 text-right text-amber-700 font-semibold">
                      {fmt(line.allocated_quantity_tons || 0)}
                    </td>
                    <td className="px-3 py-2 text-right text-amber-700">
                      {fmtEur((line.allocated_quantity_tons || 0) * (line.unit_price_eur_per_ton || 0))} {currency}
                    </td>
                    <td className={`px-3 py-2 text-right font-semibold ${lineFree > 0 ? "text-emerald-700" : "text-slate-400"}`}>
                      {fmt(lineFree)}
                    </td>
                    <td className="px-3 py-2 text-right text-blue-700 font-semibold">
                      {fmt(lineDelivered)}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-blue-800">
                      {fmtEur(lineInvoice)} {currency}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold text-slate-800 border-t-2 border-slate-300">
                <td className="px-3 py-2.5 text-sm">ÖSSZESEN</td>
                <td className="px-3 py-2.5 text-right text-sm">{fmt(totalOrdered)} t</td>
                <td className="px-3 py-2.5 text-right text-sm text-slate-900">{fmtEur(totalOrderValue)} {currency}</td>
                <td className="px-3 py-2.5 text-right text-sm text-amber-700">{fmt(totalPlannedAllocated)} t</td>
                <td className="px-3 py-2.5 text-right text-sm text-amber-700">{fmtEur(totalPlannedAllocated * avgPricePerTon)} {currency}</td>
                <td className={`px-3 py-2.5 text-right text-sm ${totalFree > 0 ? "text-emerald-700" : "text-slate-400"}`}>
                  {fmt(totalFree)} t
                </td>
                <td className="px-3 py-2.5 text-right text-sm text-blue-700">{fmt(totalDelivered)} t</td>
                <td className="px-3 py-2.5 text-right text-sm text-blue-800">{fmtEur(totalInvoiceValue)} {currency}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Summary boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-t">
        <SummaryBox label="Teljes rendelt érték" value={`${fmtEur(totalOrderValue)} ${currency}`} sub={`${fmt(totalOrdered)} t`} color="text-slate-800" />
        <SummaryBox label="Tervezett rakodáson" value={`${fmtEur(totalPlannedAllocated * avgPricePerTon)} ${currency}`} sub={`${fmt(totalPlannedAllocated)} t`} color="text-amber-700" bg="bg-amber-50" />
        <SummaryBox label="Szabad fogható" value={`${fmtEur(totalFreeValue)} ${currency}`} sub={`${fmt(totalFree)} t`} color={totalFree > 0 ? "text-emerald-700" : "text-slate-400"} bg="bg-emerald-50" />
        <SummaryBox label="Számla végösszeg" value={`${fmtEur(totalInvoiceValue)} ${currency}`} sub={`${fmt(totalDelivered)} t szállítva`} color="text-blue-700" bg="bg-blue-50" />
      </div>
    </Card>
  );
}

function SummaryBox({ label, value, sub, color, bg = "bg-white" }) {
  return (
    <div className={`px-4 py-3 border-r last:border-r-0 ${bg}`}>
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className={`text-base font-bold leading-tight ${color}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}
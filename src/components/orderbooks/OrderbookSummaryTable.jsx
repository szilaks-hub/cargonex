import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";

const fmtTon = (n) =>
  typeof n === "number"
    ? n.toLocaleString("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0,00";

const fmtVal = (n, currency = "EUR") =>
  typeof n === "number"
    ? `${n.toLocaleString("hu-HU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`
    : `0 ${currency}`;

// Active statuses = planned/booked not yet closed or cancelled
const ACTIVE_STATUSES = ["booked", "scheduled", "loaded", "in_transit", "customs", "transit", "arrived", "arrived_onsite", "arrived_offsite"];

export default function OrderbookSummaryTable({ lines, orderbookId, currency = "EUR" }) {
  const { data: trucks = [] } = useQuery({
    queryKey: ["orderbook-trucks", orderbookId],
    queryFn: () => base44.entities.Truck.filter({ orderbook_id: orderbookId }, "-created_date"),
    enabled: !!orderbookId,
    refetchInterval: 5000,
  });

  // Trucks in active statuses (booked, loaded, in transit etc.) - planned quantity
  const activeTrucks = trucks.filter((t) => ACTIVE_STATUSES.includes(t.status));
  const closedTrucks = trucks.filter((t) => t.status === "closed");

  // Total planned (active, not yet closed)
  const totalActivePlanned = activeTrucks.reduce((s, t) => s + (t.planned_quantity_tons || 0), 0);
  // Total delivered (closed, actual weight or planned fallback)
  const totalDelivered = closedTrucks.reduce((s, t) => s + (t.actual_weight_tons || t.planned_quantity_tons || 0), 0);

  // Order totals from lines
  const totalOrdered = lines.reduce((s, l) => s + (l.planned_quantity_tons || 0), 0);
  const totalOrderValue = lines.reduce((s, l) => s + (l.line_value_eur || 0), 0);
  const avgPrice = totalOrdered > 0 ? totalOrderValue / totalOrdered : 0;

  // Free = ordered - active planned - delivered
  const totalFree = Math.max(0, totalOrdered - totalActivePlanned - totalDelivered);

  // Invoice value = closed trucks * avg price (or per line)
  const totalInvoiceValue = totalDelivered * avgPrice;
  const totalActivePlannedValue = totalActivePlanned * avgPrice;
  const totalFreeValue = totalFree * avgPrice;

  return (
    <Card className="overflow-hidden border-blue-200">
      {/* Header */}
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
                const price = line.unit_price_eur_per_ton || 0;
                const ordered = line.planned_quantity_tons || 0;
                const orderValue = ordered * price;

                // Per-line: proportional share of trucks
                const share = totalOrdered > 0 ? ordered / totalOrdered : 0;
                const linePlanned = totalActivePlanned * share;
                const lineDelivered = totalDelivered * share;
                const lineFree = Math.max(0, ordered - linePlanned - lineDelivered);
                const linePlannedValue = linePlanned * price;
                const lineInvoice = lineDelivered * price;

                return (
                  <tr key={line.id} className="border-b hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800">{line.category_name}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{fmtTon(ordered)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-800">{fmtVal(orderValue, currency)}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{fmtVal(price, currency)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-amber-700">{fmtTon(linePlanned)}</td>
                    <td className="px-3 py-2 text-right text-amber-700">{fmtVal(linePlannedValue, currency)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${lineFree > 0 ? "text-emerald-700" : "text-slate-400"}`}>
                      {fmtTon(lineFree)}
                    </td>
                    <td className="px-3 py-2 text-right text-blue-700 font-semibold">{fmtTon(lineDelivered)}</td>
                    <td className="px-3 py-2 text-right font-bold text-blue-800">{fmtVal(lineInvoice, currency)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold text-slate-800 border-t-2 border-slate-300">
                <td className="px-3 py-2.5 text-xs">ÖSSZESEN</td>
                <td className="px-3 py-2.5 text-right text-xs">{fmtTon(totalOrdered)} t</td>
                <td className="px-3 py-2.5 text-right text-xs">{fmtVal(totalOrderValue, currency)}</td>
                <td className="px-3 py-2.5 text-right text-xs text-slate-400">—</td>
                <td className="px-3 py-2.5 text-right text-xs text-amber-700">{fmtTon(totalActivePlanned)} t</td>
                <td className="px-3 py-2.5 text-right text-xs text-amber-700">{fmtVal(totalActivePlannedValue, currency)}</td>
                <td className={`px-3 py-2.5 text-right text-xs ${totalFree > 0 ? "text-emerald-700" : "text-slate-400"}`}>
                  {fmtTon(totalFree)} t
                </td>
                <td className="px-3 py-2.5 text-right text-xs text-blue-700">{fmtTon(totalDelivered)} t</td>
                <td className="px-3 py-2.5 text-right text-xs text-blue-800">{fmtVal(totalInvoiceValue, currency)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* 4 summary boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-t">
        <SummaryBox
          label="Teljes rendelt érték"
          value={fmtVal(totalOrderValue, currency)}
          sub={`${fmtTon(totalOrdered)} t`}
          color="text-slate-900"
          bg="bg-white"
        />
        <SummaryBox
          label="Tervezett rakodáson"
          value={fmtVal(totalActivePlannedValue, currency)}
          sub={`${fmtTon(totalActivePlanned)} t`}
          color="text-amber-700"
          bg="bg-amber-50"
        />
        <SummaryBox
          label="Szabad (fogható)"
          value={fmtVal(totalFreeValue, currency)}
          sub={`${fmtTon(totalFree)} t`}
          color={totalFree > 0 ? "text-emerald-700" : "text-slate-400"}
          bg="bg-emerald-50"
        />
        <SummaryBox
          label="Számla végösszeg"
          value={fmtVal(totalInvoiceValue, currency)}
          sub={`${fmtTon(totalDelivered)} t szállítva`}
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
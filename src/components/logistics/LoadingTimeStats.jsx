import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, differenceInDays } from "date-fns";
import { hu } from "date-fns/locale";
import { Clock, PackageCheck, Timer, TrendingUp, CalendarRange, Printer, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

function safeDate(val) {
  if (!val) return null;
  try {
    const d = typeof val === "string" ? parseISO(val.slice(0, 10)) : new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function daysBetween(a, b) {
  const da = safeDate(a);
  const db = safeDate(b);
  if (!da || !db) return null;
  return differenceInDays(db, da);
}

function fmtDate(val) {
  const d = safeDate(val);
  if (!d) return "—";
  return format(d, "yyyy. MM. dd.", { locale: hu });
}

function fmtDuration(days) {
  if (days === null || days === undefined) return "—";
  if (days === 0) return "azonnap";
  if (days === 1) return "1 nap";
  if (days < 30) return `${days} nap`;
  const months = Math.floor(days / 30);
  const rem = days % 30;
  return rem > 0 ? `${months} hó ${rem} nap` : `${months} hó`;
}

function getDurationColor(days) {
  if (days === null || days === undefined) return "text-slate-400";
  if (days <= 3) return "text-green-600";
  if (days <= 7) return "text-blue-600";
  if (days <= 14) return "text-amber-600";
  if (days <= 30) return "text-orange-600";
  return "text-red-600";
}

function durationColorHex(days) {
  if (days === null || days === undefined) return "#94a3b8";
  if (days <= 3) return "#16a34a";
  if (days <= 7) return "#2563eb";
  if (days <= 14) return "#d97706";
  if (days <= 30) return "#ea580c";
  return "#dc2626";
}

export default function LoadingTimeStats({ trucks, orderbookMap = {} }) {
  const [sortBy, setSortBy] = useState("orderDate");
  const [minTrucks, setMinTrucks] = useState(1);

  // Only non-cancelled trucks with an orderbook link
  const activeTrucks = useMemo(
    () => trucks.filter(t => t.status !== "cancelled"),
    [trucks]
  );

  // ── Section 1: Order fulfillment time ──
  // Group trucks by orderbook_id, then measure:
  //   order_date → first truck loading → last truck loading
  const orderFulfillment = useMemo(() => {
    const groups = {};
    activeTrucks.forEach(t => {
      const obId = t.orderbook_id;
      if (!obId) return;
      if (!groups[obId]) groups[obId] = [];
      groups[obId].push(t);
    });

    return Object.entries(groups)
      .map(([obId, obTrucks]) => {
        const ob = orderbookMap[obId];
        const orderDate = ob?.order_date;
        const loadingDates = obTrucks
          .map(t => safeDate(t.actual_loading_date || t.loading_date || t.expected_loading_date))
          .filter(Boolean)
          .sort((a, b) => a - b);

        const firstLoading = loadingDates[0] || null;
        const lastLoading = loadingDates[loadingDates.length - 1] || null;

        const orderToFirst = orderDate && firstLoading ? differenceInDays(firstLoading, safeDate(orderDate)) : null;
        const firstToLast = firstLoading && lastLoading ? differenceInDays(lastLoading, firstLoading) : null;
        const orderToLast = orderDate && lastLoading ? differenceInDays(lastLoading, safeDate(orderDate)) : null;

        return {
          orderbookId: obId,
          orderNo: ob?.system_order_no || ob?.order_no || obId.slice(0, 8),
          supplierName: ob?.supplier_name || obTrucks[0]?.supplier_name || "—",
          orderDate,
          firstLoading,
          lastLoading,
          orderToFirst,
          firstToLast,
          orderToLast,
          truckCount: obTrucks.length,
        };
      })
      .filter(o => o.truckCount >= minTrucks);
  }, [activeTrucks, orderbookMap, minTrucks]);

  const sortedOrders = useMemo(() => {
    const arr = [...orderFulfillment];
    switch (sortBy) {
      case "orderDate":
        arr.sort((a, b) => (b.orderDate || "").localeCompare(a.orderDate || ""));
        break;
      case "orderToFirst":
        arr.sort((a, b) => (b.orderToFirst ?? -1) - (a.orderToFirst ?? -1));
        break;
      case "firstToLast":
        arr.sort((a, b) => (b.firstToLast ?? -1) - (a.firstToLast ?? -1));
        break;
      case "truckCount":
        arr.sort((a, b) => b.truckCount - a.truckCount);
        break;
    }
    return arr;
  }, [orderFulfillment, sortBy]);

  // Order-level summary stats
  const orderSummary = useMemo(() => {
    const valid = orderFulfillment.filter(o => o.orderToFirst !== null);
    const validSpan = orderFulfillment.filter(o => o.firstToLast !== null);
    if (valid.length === 0) return null;
    const firstValues = valid.map(o => o.orderToFirst);
    const spanValues = validSpan.map(o => o.firstToLast);
    return {
      orderCount: orderFulfillment.length,
      avgOrderToFirst: firstValues.reduce((s, v) => s + v, 0) / firstValues.length,
      avgSpan: spanValues.length > 0 ? spanValues.reduce((s, v) => s + v, 0) / spanValues.length : null,
      maxSpan: spanValues.length > 0 ? Math.max(...spanValues) : null,
      minSpan: spanValues.length > 0 ? Math.min(...spanValues) : null,
    };
  }, [orderFulfillment]);

  // ── Section 2: Per-truck lead time (created_date → mrn_date) ──
  const truckLeadTimes = useMemo(() => {
    return activeTrucks
      .map(t => {
        const created = t.created_date;
        const mrnDate = t.mrn_date || t.mrn_date_2;
        const leadDays = daysBetween(created, mrnDate);
        return {
          id: t.id,
          truckNumber: t.truck_number || "—",
          orderNo: t.orderbook_no || orderbookMap[t.orderbook_id]?.system_order_no || "—",
          supplierName: t.supplier_name || "—",
          created,
          mrnDate,
          leadDays,
          status: t.status,
        };
      })
      .filter(t => t.leadDays !== null)
      .sort((a, b) => b.leadDays - a.leadDays);
  }, [activeTrucks, orderbookMap]);

  const leadSummary = useMemo(() => {
    if (truckLeadTimes.length === 0) return null;
    const vals = truckLeadTimes.map(t => t.leadDays);
    return {
      count: vals.length,
      avg: vals.reduce((s, v) => s + v, 0) / vals.length,
      min: Math.min(...vals),
      max: Math.max(...vals),
      median: vals.sort((a, b) => a - b)[Math.floor(vals.length / 2)],
    };
  }, [truckLeadTimes]);

  const maxLeadDays = Math.max(...truckLeadTimes.map(t => t.leadDays), 1);

  const todayStr = new Date().toLocaleDateString("hu-HU");

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=1200,height=900");
    if (!win) return;

    const orderRows = sortedOrders.map(o => `
      <tr>
        <td>${o.orderNo}</td>
        <td>${o.supplierName}</td>
        <td>${fmtDate(o.orderDate)}</td>
        <td>${fmtDate(o.firstLoading)}</td>
        <td style="text-align:right;font-weight:bold;color:${durationColorHex(o.orderToFirst)}">${fmtDuration(o.orderToFirst)}</td>
        <td>${fmtDate(o.lastLoading)}</td>
        <td style="text-align:right;font-weight:bold;color:${durationColorHex(o.firstToLast)}">${fmtDuration(o.firstToLast)}</td>
        <td style="text-align:right">${o.truckCount} db</td>
        <td style="text-align:right;font-weight:bold">${o.orderToLast !== null ? fmtDuration(o.orderToLast) : "—"}</td>
      </tr>`).join("");

    const truckRows = truckLeadTimes.map(t => `
      <tr>
        <td>${t.truckNumber}</td>
        <td>${t.orderNo}</td>
        <td>${t.supplierName}</td>
        <td>${fmtDate(t.created)}</td>
        <td>${fmtDate(t.mrnDate)}</td>
        <td style="text-align:right;font-weight:bold;color:${durationColorHex(t.leadDays)}">${fmtDuration(t.leadDays)}</td>
      </tr>`).join("");

    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>Átfutási idők – ${todayStr}</title>
    <style>
      @page { size: A4 landscape; margin: 12mm; }
      body { font-family: Arial, sans-serif; font-size: 9.5px; color: #0f172a; margin: 0; }
      .rh { display:flex; justify-content:space-between; align-items:center; border-bottom:2.5px solid #1e293b; padding-bottom:10px; margin-bottom:16px; }
      .rh-title { font-size:20px; font-weight:900; }
      .rh-sub { font-size:10px; color:#64748b; margin-top:3px; }
      .rh-meta { text-align:right; font-size:10px; color:#64748b; }
      h2 { font-size:13px; font-weight:700; margin:20px 0 8px; color:#1e293b; border-bottom:1px solid #cbd5e1; padding-bottom:4px; }
      .summary { display:flex; gap:12px; margin-bottom:16px; }
      .summary div { background:#f1f5f9; border:1px solid #e2e8f0; border-radius:6px; padding:8px 14px; }
      .summary .v { font-size:18px; font-weight:800; color:#1e293b; }
      .summary .l { font-size:9px; color:#64748b; }
      table { border-collapse:collapse; width:100%; margin-bottom:8px; }
      thead th { background:#1e293b; color:white; padding:6px 8px; font-size:8.5px; font-weight:700; text-align:left; letter-spacing:0.04em; text-transform:uppercase; }
      tbody td { border:1px solid #cbd5e1; padding:5px 7px; vertical-align:top; }
      tbody tr:nth-child(even) td { background:#f8fafc; }
      .footer { margin-top:16px; font-size:9px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:8px; display:flex; justify-content:space-between; }
    </style></head><body>
      <div class="rh">
        <div>
          <div class="rh-title">Rakodási és átfutási idők</div>
          <div class="rh-sub">Loading time & lead time analysis</div>
        </div>
        <div class="rh-meta">CARGONEX · ${todayStr}</div>
      </div>
      <div class="summary">
        <div><div class="l">Rendelések</div><div class="v">${orderSummary?.orderCount || 0}</div></div>
        <div><div class="l">Átl. első kamion</div><div class="v">${orderSummary ? fmtDuration(Math.round(orderSummary.avgOrderToFirst)) : "—"}</div></div>
        <div><div class="l">Átl. teljesítés</div><div class="v">${orderSummary?.avgSpan !== null ? fmtDuration(Math.round(orderSummary.avgSpan)) : "—"}</div></div>
        <div><div class="l">Átl. MRN átfutás</div><div class="v">${leadSummary ? fmtDuration(Math.round(leadSummary.avg)) : "—"}</div></div>
      </div>
      <h2>Rendelés teljesítési idő (order_date → első rakodás → utolsó rakodás)</h2>
      <table>
        <thead><tr>
          <th>Rendelés</th><th>Beszállító</th><th>Rendelés dátum</th><th>Első rakodás</th>
          <th style="text-align:right">Első kamion</th><th>Utolsó rakodás</th>
          <th style="text-align:right">Teljesítés</th><th style="text-align:right">Kamion</th><th style="text-align:right">Összes</th>
        </tr></thead>
        <tbody>${orderRows}</tbody>
      </table>
      <h2>Kamion átfutási idő (beírás → MRN)</h2>
      <table>
        <thead><tr>
          <th>Rendszám</th><th>Rendelés</th><th>Beszállító</th>
          <th>Beírás dátum</th><th>MRN dátum</th><th style="text-align:right">Átfutás</th>
        </tr></thead>
        <tbody>${truckRows}</tbody>
      </table>
      <div class="footer"><span>CARGONEX © 2026</span><span>${todayStr}</span></div>
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  const handleExportCSV = () => {
    const sep = ";";
    const rows = [];

    rows.push(["Rakodási és átfutási idők – " + todayStr]);
    rows.push([]);

    rows.push(["RENDELÉS TELJESÍTÉSI IDŐ"]);
    rows.push(["Rendelés", "Beszállító", "Rendelés dátum", "Első rakodás", "Első kamion (nap)",
               "Utolsó rakodás", "Teljesítés (nap)", "Kamion db", "Összes (nap)"]);
    sortedOrders.forEach(o => {
      rows.push([
        o.orderNo, o.supplierName, fmtDate(o.orderDate), fmtDate(o.firstLoading),
        fmtDuration(o.orderToFirst), fmtDate(o.lastLoading), fmtDuration(o.firstToLast),
        `${o.truckCount} db`, fmtDuration(o.orderToLast)
      ]);
    });
    rows.push([]);

    rows.push(["KAMION ÁTFUTÁSI IDŐ (beírás → MRN)"]);
    rows.push(["Rendszám", "Rendelés", "Beszállító", "Beírás dátum", "MRN dátum", "Átfutás (nap)"]);
    truckLeadTimes.forEach(t => {
      rows.push([
        t.truckNumber, t.orderNo, t.supplierName,
        fmtDate(t.created), fmtDate(t.mrnDate), fmtDuration(t.leadDays)
      ]);
    });

    const csv = "\uFEFF" + rows.map(r => r.map(cell => {
      const s = String(cell ?? "");
      return s.includes(sep) || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(sep)).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atfutasi_idok_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (activeTrucks.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 shadow-sm">
        Nincs elérhető adat az átfutási idők számításához.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── HEADER ── */}
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-600" />
              <h3 className="font-semibold text-slate-800">Rakodási és átfutási idők</h3>
              <span className="text-xs text-slate-500 ml-1">Loading time & lead time analysis</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Rendelés beírásától a kamionok rakodásáig, valamint kamiononként a beírás → MRN dátum intervallum
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white gap-2" size="sm">
              <Printer className="w-4 h-4" /> Nyomtatás / PDF
            </Button>
            <Button onClick={handleExportCSV} className="bg-green-600 hover:bg-green-700 text-white gap-2" size="sm">
              <FileSpreadsheet className="w-4 h-4" /> Excel / CSV
            </Button>
          </div>
        </div>
      </div>

      {/* ── SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 bg-blue-50 border-blue-100">
          <div className="flex items-center gap-1.5 text-xs text-blue-500 font-medium">
            <PackageCheck className="w-3.5 h-3.5" /> Rendelések
          </div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{orderSummary?.orderCount || 0}</div>
          <div className="text-[10px] text-slate-400">vizsgált orderbook</div>
        </Card>
        <Card className="p-3 bg-green-50 border-green-100">
          <div className="flex items-center gap-1.5 text-xs text-green-500 font-medium">
            <Timer className="w-3.5 h-3.5" /> Átl. első kamion
          </div>
          <div className="text-2xl font-bold text-green-700 mt-1">
            {orderSummary ? fmtDuration(Math.round(orderSummary.avgOrderToFirst)) : "—"}
          </div>
          <div className="text-[10px] text-slate-400">rendeléstől az első rakodásig</div>
        </Card>
        <Card className="p-3 bg-amber-50 border-amber-100">
          <div className="flex items-center gap-1.5 text-xs text-amber-500 font-medium">
            <CalendarRange className="w-3.5 h-3.5" /> Átl. teljesítés
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {orderSummary?.avgSpan !== null ? fmtDuration(Math.round(orderSummary.avgSpan)) : "—"}
          </div>
          <div className="text-[10px] text-slate-400">első → utolsó kamion</div>
        </Card>
        <Card className="p-3 bg-purple-50 border-purple-100">
          <div className="flex items-center gap-1.5 text-xs text-purple-500 font-medium">
            <TrendingUp className="w-3.5 h-3.5" /> Átl. MRN átfutás
          </div>
          <div className="text-2xl font-bold text-purple-700 mt-1">
            {leadSummary ? fmtDuration(Math.round(leadSummary.avg)) : "—"}
          </div>
          <div className="text-[10px] text-slate-400">kamion beírás → MRN</div>
        </Card>
      </div>

      {/* ── SECTION 1: Order fulfillment ── */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-slate-700">Rendelés teljesítési idő</span>
            <span className="text-xs text-slate-400">order_date → első rakodás → utolsó rakodás</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={minTrucks}
              onChange={e => setMinTrucks(parseInt(e.target.value))}
              className="h-7 text-xs border border-slate-200 rounded-md bg-white px-2"
            >
              <option value={1}>Min. 1 kamion</option>
              <option value={2}>Min. 2 kamion</option>
              <option value={3}>Min. 3 kamion</option>
              <option value={5}>Min. 5 kamion</option>
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="h-7 text-xs border border-slate-200 rounded-md bg-white px-2"
            >
              <option value="orderDate">Rendezés: Rendelés dátuma</option>
              <option value="orderToFirst">Rendezés: Első kamion késése</option>
              <option value="firstToLast">Rendezés: Teljesítési idő</option>
              <option value="truckCount">Rendezés: Kamionok száma</option>
            </select>
          </div>
        </div>

        {sortedOrders.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">Nincs rendelés adat a szűrőfeltételek mellett.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: "0.82rem" }}>
              <thead className="bg-slate-50/50 border-b">
                <tr className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="py-2 px-3">Rendelés</th>
                  <th className="py-2 px-3">Beszállító</th>
                  <th className="py-2 px-3">Rendelés dátum</th>
                  <th className="py-2 px-3">Első rakodás</th>
                  <th className="py-2 px-3 text-right">Első kamion</th>
                  <th className="py-2 px-3">Utolsó rakodás</th>
                  <th className="py-2 px-3 text-right">Teljesítés</th>
                  <th className="py-2 px-3 text-right">Összes</th>
                  <th className="py-2 px-3 text-center">Idővonal</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.slice(0, 50).map(o => (
                  <tr key={o.orderbookId} className="border-b hover:bg-slate-50/60 transition-colors">
                    <td className="py-2 px-3 font-semibold text-blue-700 whitespace-nowrap">{o.orderNo}</td>
                    <td className="py-2 px-3 text-slate-600 max-w-[10rem] truncate">{o.supplierName}</td>
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{fmtDate(o.orderDate)}</td>
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{fmtDate(o.firstLoading)}</td>
                    <td className={`py-2 px-3 text-right font-bold whitespace-nowrap ${getDurationColor(o.orderToFirst)}`}>
                      {fmtDuration(o.orderToFirst)}
                    </td>
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{fmtDate(o.lastLoading)}</td>
                    <td className={`py-2 px-3 text-right font-bold whitespace-nowrap ${getDurationColor(o.firstToLast)}`}>
                      {fmtDuration(o.firstToLast)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-700 font-semibold">{o.truckCount} db</td>
                    <td className="py-2 px-3">
                      <TimelineBar
                        orderToFirst={o.orderToFirst}
                        firstToLast={o.firstToLast}
                        orderToLast={o.orderToLast}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── SECTION 2: Per-truck lead time ── */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-slate-700">Kamion átfutási idő (beírás → MRN)</span>
            <span className="text-xs text-slate-400">created_date → mrn_date</span>
          </div>
          {leadSummary && (
            <div className="flex items-center gap-3 text-xs">
              <Badge className="bg-green-100 text-green-700 border-green-200">Min: {fmtDuration(leadSummary.min)}</Badge>
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">Átlag: {fmtDuration(Math.round(leadSummary.avg))}</Badge>
              <Badge className="bg-red-100 text-red-700 border-red-200">Max: {fmtDuration(leadSummary.max)}</Badge>
            </div>
          )}
        </div>

        {truckLeadTimes.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">Nincs kamion beírás → MRN adat.</div>
        ) : (
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full" style={{ fontSize: "0.82rem" }}>
              <thead className="bg-slate-50/50 border-b sticky top-0">
                <tr className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="py-2 px-3">Rendszám</th>
                  <th className="py-2 px-3">Rendelés</th>
                  <th className="py-2 px-3">Beszállító</th>
                  <th className="py-2 px-3">Beírás dátum</th>
                  <th className="py-2 px-3">MRN dátum</th>
                  <th className="py-2 px-3 text-right">Átfutás</th>
                  <th className="py-2 px-3 text-center">Vizuális</th>
                </tr>
              </thead>
              <tbody>
                {truckLeadTimes.slice(0, 100).map(t => (
                  <tr key={t.id} className="border-b hover:bg-slate-50/60 transition-colors">
                    <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">{t.truckNumber}</td>
                    <td className="py-2 px-3 text-blue-700 font-medium whitespace-nowrap">{t.orderNo}</td>
                    <td className="py-2 px-3 text-slate-600 max-w-[10rem] truncate">{t.supplierName}</td>
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{fmtDate(t.created)}</td>
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{fmtDate(t.mrnDate)}</td>
                    <td className={`py-2 px-3 text-right font-bold whitespace-nowrap ${getDurationColor(t.leadDays)}`}>
                      {fmtDuration(t.leadDays)}
                    </td>
                    <td className="py-2 px-3">
                      <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden min-w-[80px]">
                        <div
                          className="absolute left-0 top-0 h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(4, (t.leadDays / maxLeadDays) * 100)}%`,
                            background: t.leadDays <= 3 ? "#22c55e" : t.leadDays <= 7 ? "#3b82f6" : t.leadDays <= 14 ? "#f59e0b" : t.leadDays <= 30 ? "#f97316" : "#ef4444",
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// Mini timeline: order ──→ first ──→ last
function TimelineBar({ orderToFirst, firstToLast, orderToLast }) {
  if (orderToLast === null || orderToLast === undefined) {
    return <div className="text-[10px] text-slate-300 text-center">—</div>;
  }
  const total = orderToLast || 1;
  const firstPct = orderToFirst !== null ? (orderToFirst / total) * 100 : 0;
  const spanPct = firstToLast !== null ? (firstToLast / total) * 100 : 0;

  return (
    <div className="flex items-center gap-1 min-w-[100px]">
      <div className="relative flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        {/* First truck segment */}
        <div
          className="absolute left-0 top-0 h-full bg-green-400"
          style={{ width: `${firstPct}%` }}
        />
        {/* Span segment */}
        <div
          className="absolute top-0 h-full bg-amber-400"
          style={{ left: `${firstPct}%`, width: `${spanPct}%` }}
        />
      </div>
      <span className="text-[9px] text-slate-400 whitespace-nowrap">{orderToLast}n</span>
    </div>
  );
}
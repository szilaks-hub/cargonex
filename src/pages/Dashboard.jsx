import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Truck, Package, ShieldCheck, Euro, MapPin, Users, ClipboardList,
  FileText, TrendingUp, Clock, CheckCircle2, AlertCircle, BarChart2,
  ArrowRight, Globe, Box, Layers
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, AreaChart, Area
} from "recharts";

const COLORS = ["#3B6CF4", "#f59e0b", "#22c55e", "#e05a2b", "#8b5cf6", "#06b6d4", "#ec4899", "#10b981"];

const cardBase = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
};

const fmt = (n, d = 0) =>
  n ? Number(n).toLocaleString("hu-HU", { minimumFractionDigits: d, maximumFractionDigits: d }) : "—";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 shadow-lg">
        {label && <p className="font-semibold mb-1">{label}</p>}
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || p.fill }} className="font-medium">
            {p.name}: {typeof p.value === "number" ? p.value.toLocaleString("hu-HU") : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function KpiCard({ label, value, sub, icon: Icon, accent, link, trend }) {
  const inner = (
    <div className="group p-5 rounded-lg bg-white border border-slate-200/60 hover:border-slate-300 hover:shadow-sm transition-all duration-200 cursor-pointer">
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="text-3xl font-semibold text-slate-900 tracking-tight">{value}</div>
        {sub && <div className="text-xs text-slate-400">{sub}</div>}
      </div>
    </div>
  );
  return link ? <Link to={createPageUrl(link)}>{inner}</Link> : inner;
}

function SectionTitle({ children, sub, accent = "#3B6CF4" }) {
  return (
    <div className="mb-4">
      <div>
        <h2 className="text-base font-bold text-slate-800 leading-none">{children}</h2>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function SectionDivider({ label }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-slate-200" />
      {label && <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{label}</span>}
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

export default function Dashboard() {
  const [countyFilter, setCountyFilter] = useState(null);

  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => base44.entities.Truck.list() });
  const { data: orderbooks = [] } = useQuery({ queryKey: ["orderbooks"], queryFn: () => base44.entities.Orderbook.list() });
  const { data: orderbookLines = [] } = useQuery({ queryKey: ["orderbook-lines"], queryFn: () => base44.entities.OrderbookLine.list() });
  const { data: partners = [] } = useQuery({ queryKey: ["partners"], queryFn: () => base44.entities.Partner.list() });
  const { data: freightSheets = [] } = useQuery({ queryKey: ["freight-sheets"], queryFn: () => base44.entities.FreightSheet.list() });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: () => base44.entities.ProductCategory.list() });

  // ── Truck breakdowns ────────────────────────────────────────────
  const activeTrucks = trucks.filter(t => !["cancelled"].includes(t.status));
  const openTrucks = trucks.filter(t => ["booked", "loaded"].includes(t.status));
  const financeControl = trucks.filter(t => t.status === "finance_control");
  const closedTrucks = trucks.filter(t => t.status === "closed");
  const cancelledTrucks = trucks.filter(t => t.status === "cancelled");
  const transitTrucks = trucks.filter(t => t.transit);

  // ── Orderbook stats ─────────────────────────────────────────────
  const openOrderbooks = orderbooks.filter(o => o.status === "open");
  const closedOrderbooks = orderbooks.filter(o => o.status === "closed");
  const openOrderbookIds = new Set(openOrderbooks.map(o => o.id));
  // Only count lines belonging to OPEN orderbooks (same logic as Orderbooks page)
  const openLines = orderbookLines.filter(l => openOrderbookIds.has(l.orderbook_id));
  const totalOrderValueEur = openLines.reduce((s, l) => s + (l.line_value_eur || 0), 0);
  const avgPricePerTon = useMemo(() => {
    const totalTons = openLines.reduce((s, l) => s + (l.planned_quantity_tons || 0), 0);
    const totalVal = openLines.reduce((s, l) => s + (l.line_value_eur || 0), 0);
    return totalTons > 0 ? totalVal / totalTons : 0;
  }, [openLines]);

  // ── Supplier/carrier/customs agent counts ───────────────────────
  const suppliers = partners.filter(p => p.roles?.includes("supplier"));
  const carriers = partners.filter(p => p.roles?.includes("carrier"));
  const customsAgents = partners.filter(p => p.roles?.includes("customs_agent"));
  const activeFreightSheets = freightSheets.filter(s => s.status === "active");

  // ── Total allocated tons in open orderbooks ─────────────────────
  const allocatedTons = openLines.reduce((s, l) => s + (l.allocated_quantity_tons || 0), 0);
  const plannedTons = openLines.reduce((s, l) => s + (l.planned_quantity_tons || 0), 0);
  const waitingTons = plannedTons - allocatedTons;

  // ── Status breakdown for pie ────────────────────────────────────
  const statusData = [
    { name: "Előjegyzett", value: trucks.filter(t => t.status === "booked").length, color: "#94a3b8" },
    { name: "Megrakott", value: trucks.filter(t => t.status === "loaded").length, color: "#f59e0b" },
    { name: "Pénzügy", value: financeControl.length, color: "#eab308" },
    { name: "Lezárt", value: closedTrucks.length, color: "#22c55e" },
    { name: "Törölve", value: cancelledTrucks.length, color: "#ef4444" },
  ].filter(d => d.value > 0);

  // ── Country breakdown ───────────────────────────────────────────
  const countryMap = {};
  activeTrucks.forEach(t => {
    if (t.destination_country) {
      if (!countryMap[t.destination_country]) countryMap[t.destination_country] = { count: 0, tons: 0 };
      countryMap[t.destination_country].count++;
      countryMap[t.destination_country].tons += t.actual_weight_tons || t.planned_quantity_tons || 0;
    }
  });
  const countryTotal = activeTrucks.filter(t => t.destination_country).length;
  const countryData = Object.entries(countryMap)
    .sort((a,b)=>b[1].count-a[1].count)
    .map(([name, v]) => ({ name, count: v.count, tons: v.tons, pct: countryTotal > 0 ? Math.round(v.count / countryTotal * 100) : 0 }));

  // ── County breakdown (HU) ───────────────────────────────────────
  const normalizeCounty = (raw) => {
    if (!raw) return "Ismeretlen";
    const s = raw.trim().toLowerCase();
    if (s.includes("budapest") || s.includes("főváros") || s.includes("fovaros")) return "Budapest";
    return raw.trim();
  };
  const countyMap = {};
  activeTrucks.filter(t => t.destination_country === "HU").forEach(t => {
    const county = normalizeCounty(t.destination_county);
    if (!countyMap[county]) countyMap[county] = { total: 0, open: 0, closed: 0 };
    countyMap[county].total++;
    if (["booked","loaded"].includes(t.status)) countyMap[county].open++;
    if (t.status === "closed") countyMap[county].closed++;
  });
  const countyTotal = Object.values(countyMap).reduce((s, v) => s + v.total, 0);
  const countyData = Object.entries(countyMap)
    .sort((a,b)=>b[1].total-a[1].total)
    .slice(0, 12)
    .map(([name, v]) => ({ name, ...v, pct: countyTotal > 0 ? Math.round(v.total / countyTotal * 100) : 0 }));

  // ── Monthly closed trucks trend ─────────────────────────────────
  const monthlyMap = {};
  closedTrucks.forEach(t => {
    const d = t.closed_date || t.updated_date;
    if (!d) return;
    const key = d.slice(0, 7); // YYYY-MM
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, darab: 0, tonnas: 0 };
    monthlyMap[key].darab++;
    monthlyMap[key].tonnas += t.actual_weight_tons || t.planned_quantity_tons || 0;
  });
  const monthlyData = Object.values(monthlyMap).sort((a,b)=>a.month.localeCompare(b.month)).slice(-12);

  // ── Carrier breakdown ───────────────────────────────────────────
  const carrierMap = {};
  activeTrucks.forEach(t => {
    if (t.carrier_name) carrierMap[t.carrier_name] = (carrierMap[t.carrier_name] || 0) + 1;
  });
  const carrierData = Object.entries(carrierMap).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value}));

  // ── Orderbook category distribution (open orders only) ─────────
  const catMap = {};
  openLines.forEach(l => {
    const name = l.category_name || "Egyéb";
    if (!catMap[name]) catMap[name] = { name, tons: 0, value: 0 };
    catMap[name].tons += l.planned_quantity_tons || 0;
    catMap[name].value += l.line_value_eur || 0;
  });
  const catData = Object.values(catMap).sort((a,b)=>b.value-a.value);

  // ── Finance: pending vs closed ──────────────────────────────────
  const mrnPending = financeControl.length;
  const mrnClosed = closedTrucks.filter(t => t.mrn_number).length;
  const totalMrnHuf = closedTrucks.reduce((s,t) => s + (t.total_base||0), 0);

  // ── Customs value on closed trucks with exchange rate ───────────
  const totalGoodsEur = closedTrucks.reduce((s,t) => s + (t.goods_value||0), 0);

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-base mt-2 text-slate-600">Logistics & Shipment Overview</p>
        </div>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg border border-blue-400/20">
          <div className="text-xs font-semibold text-blue-100 mb-2 uppercase tracking-wide">Nyitott fuvar</div>
          <div className="text-4xl font-bold text-white mb-1">{openTrucks.length}</div>
          <div className="text-sm text-blue-100">kamion úton</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl shadow-lg border border-orange-400/20">
          <div className="text-xs font-semibold text-orange-100 mb-2 uppercase tracking-wide">Pénzügyi kontrol</div>
          <div className="text-4xl font-bold text-white mb-1">{financeControl.length}</div>
          <div className="text-sm text-orange-100">vámkezelés alatt</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg border border-purple-400/20">
          <div className="text-xs font-semibold text-purple-100 mb-2 uppercase tracking-wide">Nyitott rendelés</div>
          <div className="text-4xl font-bold text-white mb-1">{openOrderbooks.length}</div>
          <div className="text-sm text-purple-100">aktív rendelés</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-xl shadow-lg border border-emerald-400/20">
          <div className="text-xs font-semibold text-emerald-100 mb-2 uppercase tracking-wide">Fennmaradó rendelés érték</div>
          <div className="text-3xl font-bold text-white mb-1">
            {totalOrderValueEur > 0
              ? totalOrderValueEur.toLocaleString("hu-HU", { maximumFractionDigits: 0 }) + " €"
              : "0 €"}
          </div>
          <div className="text-xl font-bold text-emerald-100">{plannedTons.toLocaleString("hu-HU", { maximumFractionDigits: 0 })} t fennmaradó rendelés</div>
        </div>
      </div>

      {/* Charts Section */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-5">📊 Statisztikák & Grafikonok</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Truck status donut */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-xl shadow-md border border-slate-200">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
            Fuvarok státusza
          </h3>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={78} innerRadius={42} strokeWidth={0}>
                    {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                {statusData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="truncate">{d.name}</span>
                    <span className="font-bold text-slate-700 ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="h-48 flex items-center justify-center text-sm text-slate-400">Nincs adat</div>}
        </div>

        {/* Country bar */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl shadow-md border border-orange-200">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-6 bg-orange-500 rounded-full"></div>
            Célország bontás
          </h3>
          {countryData.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1 pb-1 border-b border-orange-200">
                <div className="col-span-2">Ország</div>
                <div className="col-span-2 text-right">db</div>
                <div className="col-span-1 text-right">%</div>
                <div className="col-span-3 text-right">Tonna</div>
                <div className="col-span-4"></div>
              </div>
              {countryData.map((c, i) => (
                <div key={c.name} className="grid grid-cols-12 gap-1 items-center px-1 py-1 rounded-lg hover:bg-orange-50/60 transition-colors">
                  <div className="col-span-2 text-xs font-bold text-slate-900">{c.name}</div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-bold text-slate-900">{c.count}</span>
                    <span className="text-[10px] text-slate-500 ml-0.5">db</span>
                  </div>
                  <div className="col-span-1 text-right">
                    <span className="text-xs font-bold text-slate-900">{c.pct}%</span>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="text-xs font-bold text-slate-900">{c.tons.toLocaleString("hu-HU", {maximumFractionDigits: 0})}</span>
                    <span className="text-[10px] text-slate-500 ml-0.5">t</span>
                  </div>
                  <div className="col-span-4">
                    <div className="w-full h-2.5 bg-orange-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400 rounded-full" style={{width: `${c.pct}%`}} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="h-48 flex items-center justify-center text-sm text-slate-400">Nincs adat</div>}
        </div>

        {/* Carrier breakdown */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-xl shadow-md border border-emerald-200">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
            Fuvarozók
          </h3>
          {carrierData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={carrierData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={38} strokeWidth={0}>
                    {carrierData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                {carrierData.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-1 text-[10px] text-slate-500">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="truncate max-w-[100px]">{c.name}</span>
                    <span className="font-bold text-slate-700">({c.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="h-48 flex items-center justify-center text-sm text-slate-400">Nincs adat</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly trend */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
          <h3 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
            <div className="w-2 h-6 bg-purple-500 rounded-full"></div>
            Havi teljesítmény
            <span className="ml-auto text-xs font-normal text-slate-400">utolsó 12 hónap</span>
          </h3>
          {monthlyData.length > 0 ? (
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-1 border-b border-slate-100">
                <div className="col-span-2">Hónap</div>
                <div className="col-span-2 text-right">Fuvar</div>
                <div className="col-span-2 text-right">Tonna</div>
                <div className="col-span-6">Megoszlás</div>
              </div>
              {(() => {
                const maxTons = Math.max(...monthlyData.map(m => m.tonnas), 1);
                const maxDb = Math.max(...monthlyData.map(m => m.darab), 1);
                return monthlyData.map((m, i) => {
                  const isLast = i === monthlyData.length - 1;
                  const tPct = (m.tonnas / maxTons) * 100;
                  const dPct = (m.darab / maxDb) * 100;
                  return (
                    <div key={m.month} className={`grid grid-cols-12 gap-2 items-center px-1 py-1.5 rounded-lg transition-colors ${isLast ? "bg-purple-50 border border-purple-100" : "hover:bg-slate-50"}`}>
                      <div className="col-span-2 text-xs font-semibold text-slate-700">
                        {m.month.replace("-", ". ")}
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-sm font-bold text-blue-600">{m.darab}</span>
                        <span className="text-[10px] text-slate-400 ml-0.5">db</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-sm font-bold text-emerald-600">{m.tonnas.toLocaleString("hu-HU", {maximumFractionDigits: 0})}</span>
                        <span className="text-[10px] text-slate-400 ml-0.5">t</span>
                      </div>
                      <div className="col-span-6 space-y-1">
                        <div className="flex items-center gap-1">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400 rounded-full transition-all" style={{width: `${dPct}%`}} />
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full transition-all" style={{width: `${tPct}%`}} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
              <div className="flex gap-4 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <div className="w-3 h-2 rounded-sm bg-blue-400" /> Fuvar (db)
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <div className="w-3 h-2 rounded-sm bg-emerald-400" /> Tonna (t)
                </div>
              </div>
            </div>
          ) : <div className="h-48 flex items-center justify-center text-sm text-slate-400">Nincs lezárt fuvar</div>}
        </div>

        {/* County breakdown HU */}
        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-6 rounded-xl shadow-md border border-cyan-200">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-6 bg-cyan-500 rounded-full"></div>
            Megye bontás (HU)
          </h3>
          {countyData.length > 0 ? (
            <div className="space-y-2">
              {countyData.map((c, i) => (
                <div key={c.name} className="flex items-center gap-2">
                  <div className="w-20 text-xs font-semibold text-slate-700 truncate flex-shrink-0">{c.name}</div>
                  <div className="flex-1 flex h-5 rounded-md overflow-hidden bg-slate-100">
                    {c.open > 0 && (
                      <div className="h-full bg-amber-400 flex items-center justify-center text-[9px] font-bold text-white"
                        style={{width: `${(c.open / c.total) * 100}%`}}>
                        {c.open > 1 ? c.open : ""}
                      </div>
                    )}
                    {c.closed > 0 && (
                      <div className="h-full bg-emerald-400 flex items-center justify-center text-[9px] font-bold text-white"
                        style={{width: `${(c.closed / c.total) * 100}%`}}>
                        {c.closed > 1 ? c.closed : ""}
                      </div>
                    )}
                  </div>
                  <div className="w-16 flex items-center gap-1 flex-shrink-0">
                    <span className="text-xs font-bold text-slate-700">{c.total}</span>
                    <span className="text-[10px] text-slate-400">({c.pct}%)</span>
                  </div>
                </div>
              ))}
              <div className="flex gap-4 pt-2 border-t border-slate-200/60">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <div className="w-3 h-2 rounded-sm bg-amber-400" /> Nyitott
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <div className="w-3 h-2 rounded-sm bg-emerald-400" /> Lezárt
                </div>
              </div>
            </div>
          ) : <div className="h-48 flex items-center justify-center text-sm text-slate-400">Nincs HU szállítás</div>}
        </div>
      </div>



      {/* Recent Trucks */}
      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl shadow-md border border-indigo-200">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
            Legutóbbi fuvarok
          </h3>
          <Link to={createPageUrl("Logistics")} className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
            Összes <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 border-b border-slate-200">
                <th className="pb-3 pr-4">Rendszám</th>
                <th className="pb-3 pr-4">Termék</th>
                <th className="pb-3 pr-4">Fuvarozó</th>
                <th className="pb-3 pr-4">Célállomás</th>
                <th className="pb-3 pr-4 text-right">Tonna</th>
                <th className="pb-3">Státusz</th>
              </tr>
            </thead>
            <tbody>
              {trucks.slice(0, 8).map(t => {
                const statusColors = {
                  booked: "bg-slate-100 text-slate-600",
                  loaded: "bg-orange-100 text-orange-700",
                  finance_control: "bg-yellow-100 text-yellow-700",
                  closed: "bg-green-100 text-green-700",
                  cancelled: "bg-red-100 text-red-500",
                };
                const statusLabels = { booked:"Előjegyzett", loaded:"Megrakott", finance_control:"Pénzügy", closed:"Lezárt", cancelled:"Törölve" };
                return (
                  <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 pr-4 font-medium text-slate-900">{t.truck_number || "—"}</td>
                    <td className="py-3 pr-4 text-slate-600 max-w-[120px] truncate">{t.product_name || "—"}</td>
                    <td className="py-3 pr-4 text-slate-600 max-w-[100px] truncate">{t.carrier_name || "—"}</td>
                    <td className="py-3 pr-4 text-slate-600">{t.destination_country}{t.destination_city ? ` · ${t.destination_city}` : ""}</td>
                    <td className="py-3 pr-4 text-right font-medium text-slate-900">{t.actual_weight_tons?.toFixed(1) || t.planned_quantity_tons?.toFixed(1) || "—"}</td>
                    <td className="py-3">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${statusColors[t.status] || "bg-slate-100 text-slate-500"}`}>
                        {statusLabels[t.status] || t.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {trucks.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-slate-400">Nincs fuvar</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
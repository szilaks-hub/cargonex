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
  background: "#fff",
  border: "1px solid #E8ECF4",
  borderRadius: "16px",
  boxShadow: "0 2px 12px rgba(15,23,60,0.06)",
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
    <div className="p-4 rounded-2xl flex flex-col gap-2 h-full transition-all hover:shadow-md cursor-pointer" style={cardBase}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 leading-tight">{label}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: accent + "22" }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-800 leading-none">{value}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
      {trend !== undefined && (
        <div className={`text-[11px] font-semibold flex items-center gap-0.5 ${trend >= 0 ? "text-emerald-500" : "text-red-400"}`}>
          <TrendingUp className="w-3 h-3" /> {trend >= 0 ? "+" : ""}{trend}%
        </div>
      )}
    </div>
  );
  return link ? <Link to={createPageUrl(link)}>{inner}</Link> : inner;
}

function SectionTitle({ children, sub, accent = "#3B6CF4" }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        <div className="w-1 h-7 rounded-full flex-shrink-0" style={{ background: `linear-gradient(180deg, ${accent}, ${accent}88)` }} />
        <div>
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest leading-none">{children}</h2>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function SectionDivider({ label }) {
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
      {label && <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest whitespace-nowrap">{label}</span>}
      <div className="flex-1 h-px bg-gradient-to-l from-slate-200 to-transparent" />
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
  const totalOrderValueEur = orderbookLines.reduce((s, l) => s + (l.line_value_eur || 0), 0);
  const avgPricePerTon = useMemo(() => {
    const totalTons = orderbookLines.reduce((s, l) => s + (l.planned_quantity_tons || 0), 0);
    const totalVal = orderbookLines.reduce((s, l) => s + (l.line_value_eur || 0), 0);
    return totalTons > 0 ? totalVal / totalTons : 0;
  }, [orderbookLines]);

  // ── Supplier/carrier/customs agent counts ───────────────────────
  const suppliers = partners.filter(p => p.roles?.includes("supplier"));
  const carriers = partners.filter(p => p.roles?.includes("carrier"));
  const customsAgents = partners.filter(p => p.roles?.includes("customs_agent"));
  const activeFreightSheets = freightSheets.filter(s => s.status === "active");

  // ── Total allocated tons in open orderbooks ─────────────────────
  const allocatedTons = orderbookLines.reduce((s, l) => s + (l.allocated_quantity_tons || 0), 0);
  const plannedTons = orderbookLines.reduce((s, l) => s + (l.planned_quantity_tons || 0), 0);
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
    if (t.destination_country) countryMap[t.destination_country] = (countryMap[t.destination_country] || 0) + 1;
  });
  const countryData = Object.entries(countryMap).sort((a,b)=>b[1]-a[1]).map(([name, value]) => ({ name, value }));

  // ── County breakdown (HU) ───────────────────────────────────────
  const countyMap = {};
  activeTrucks.filter(t => t.destination_country === "HU").forEach(t => {
    const county = t.destination_county || "Ismeretlen";
    if (!countyMap[county]) countyMap[county] = { total: 0, open: 0, closed: 0 };
    countyMap[county].total++;
    if (["booked","loaded"].includes(t.status)) countyMap[county].open++;
    if (t.status === "closed") countyMap[county].closed++;
  });
  const countyData = Object.entries(countyMap)
    .sort((a,b)=>b[1].total-a[1].total)
    .slice(0, 12)
    .map(([name, v]) => ({ name, ...v }));

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

  // ── Orderbook category distribution ────────────────────────────
  const catMap = {};
  orderbookLines.forEach(l => {
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
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Delivery Tracking Overview</h1>
          <p className="text-sm mt-0.5 text-slate-500">Logistics management &amp; shipment overview — CARGONEX</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          {new Date().toLocaleDateString("hu-HU", { year:"numeric", month:"long", day:"numeric" })}
        </div>
      </div>

      {/* ── SECTION 0: FINANCE + CATEGORIES (prominently at top) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Finance summary */}
        <div className="p-5 rounded-2xl relative overflow-hidden" style={{ ...cardBase, background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #3B6CF4 100%)" }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #fff 0%, transparent 60%)" }} />
          <div className="relative">
            <SectionTitle sub="Vám és pénzügyi összesítő" accent="#fff">
              <span className="text-white">💰 Finance / Customs összesítő</span>
            </SectionTitle>
            <div className="grid grid-cols-2 gap-3 mt-1">
              {[
                { label: "MRN-re vár", value: mrnPending, colorBg: "rgba(234,179,8,0.25)", colorText: "#fde047", sub: "finance_control státusz" },
                { label: "MRN lezárva", value: mrnClosed, colorBg: "rgba(34,197,94,0.2)", colorText: "#86efac", sub: "lezárt fuvarok" },
                { label: "Összes vámolt (HUF)", value: totalMrnHuf > 0 ? fmt(totalMrnHuf) : "—", colorBg: "rgba(255,255,255,0.12)", colorText: "#bfdbfe", sub: "total_base összesen" },
                { label: "Összes rendelés (EUR)", value: totalOrderValueEur > 0 ? fmt(totalOrderValueEur, 0) : "—", colorBg: "rgba(255,255,255,0.12)", colorText: "#e9d5ff", sub: "összes rendelési érték" },
              ].map(item => (
                <div key={item.label} className="rounded-xl p-3" style={{ background: item.colorBg }}>
                  <p className="text-[10px] font-semibold text-blue-200">{item.label}</p>
                  <p className="text-lg font-bold mt-0.5 leading-none" style={{ color: item.colorText }}>{item.value}</p>
                  <p className="text-[10px] text-blue-300 mt-1">{item.sub}</p>
                </div>
              ))}
            </div>
            <Link to={createPageUrl("Finance")} className="mt-4 flex items-center gap-2 text-xs font-semibold text-blue-200 hover:text-white transition-colors">
              Finance / Customs oldal <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Category distribution */}
        <div className="p-5 rounded-2xl" style={cardBase}>
          <SectionTitle sub="Termékkategóriák rendelési értéke és tonnája" accent="#8b5cf6">📦 Termékkategória bontás</SectionTitle>
          {catData.length > 0 ? (
            <div className="space-y-2.5 mt-1">
              {catData.slice(0, 6).map((c, i) => {
                const pct = catData[0].value > 0 ? (c.value / catData[0].value) * 100 : 0;
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="font-semibold text-slate-700 truncate max-w-[140px]">{c.name}</span>
                      </div>
                      <span className="text-slate-400 text-[11px] whitespace-nowrap">
                        {fmt(c.tons, 1)} t &nbsp;·&nbsp; <span className="font-semibold text-slate-600">{fmt(c.value, 0)} EUR</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div className="h-32 flex items-center justify-center text-sm text-slate-400">Nincs rendelési sor</div>}
        </div>
      </div>

      <SectionDivider label="Fuvarok & Rendelések" />

      {/* ── SECTION 1: FUVAROK ─────────────────────────────────── */}
      <div>
        <SectionTitle sub="Összes kamion és státusz áttekintés" accent="#3B6CF4">🚛 Fuvarok (Trucks)</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Nyitott fuvar" value={openTrucks.length} sub="Előjegyzett + Megrakott" icon={Truck} accent="#3B6CF4" link="Logistics" />
          <KpiCard label="Megrakott" value={trucks.filter(t=>t.status==="loaded").length} sub="Úton lévő" icon={Package} accent="#f59e0b" link="Logistics" />
          <KpiCard label="Pénzügyi kontrol" value={financeControl.length} sub="Vám-ellenőrzés alatt" icon={AlertCircle} accent="#eab308" link="Finance" />
          <KpiCard label="Lezárt" value={closedTrucks.length} sub="Összes lezárt fuvar" icon={CheckCircle2} accent="#22c55e" link="Logistics" />
          <KpiCard label="Tranzit (TR)" value={transitTrucks.length} sub="Aktív tranzit" icon={Globe} accent="#8b5cf6" link="Logistics" />
          <KpiCard label="Összesen" value={trucks.length} sub="Minden fuvar" icon={BarChart2} accent="#e05a2b" />
        </div>
      </div>

      {/* ── SECTION 2: RENDELÉSEK ──────────────────────────────── */}
      <div>
        <SectionTitle sub="Rendelések, értékek és átlagárak" accent="#f59e0b">📋 Rendelések (Orderbooks)</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard label="Nyitott rendelés" value={openOrderbooks.length} sub={`${closedOrderbooks.length} lezárt`} icon={FileText} accent="#3B6CF4" link="Orderbooks" />
          <KpiCard label="Összes rendelt (t)" value={fmt(plannedTons, 1)} sub="Tervezett" icon={Box} accent="#f59e0b" />
          <KpiCard label="Allokált (t)" value={fmt(allocatedTons, 1)} sub="Kiszállítva / lefoglalt" icon={Truck} accent="#22c55e" />
          <KpiCard label="Várakozó (t)" value={fmt(waitingTons, 1)} sub="Még kiszállítandó" icon={Clock} accent="#e05a2b" />
          <KpiCard label="Összes érték" value={totalOrderValueEur > 0 ? (totalOrderValueEur/1000).toFixed(0) + "k EUR" : "—"} sub={`Átl. ${fmt(avgPricePerTon,0)} EUR/t`} icon={Euro} accent="#8b5cf6" link="Orderbooks" />
        </div>
      </div>

      <SectionDivider label="Rendszer adatok" />

      {/* ── SECTION 3: PARTNER & RENDSZER STATS ───────────────── */}
      <div>
        <SectionTitle sub="Partnerek, fuvarlapok, termékkategóriák" accent="#22c55e">🗂️ Rendszer adatok</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Szállítók" value={suppliers.length} sub="Aktív partnerek" icon={Users} accent="#3B6CF4" link="Partners" />
          <KpiCard label="Fuvarozók" value={carriers.length} sub="Aktív fuvarozók" icon={Truck} accent="#f59e0b" link="Partners" />
          <KpiCard label="Vámügynökök" value={customsAgents.length} sub="Aktív ügynökök" icon={ShieldCheck} accent="#22c55e" link="Partners" />
          <KpiCard label="Termékkategóriák" value={categories.filter(c=>c.status==="active").length} sub={`${categories.length} összesen`} icon={Layers} accent="#8b5cf6" link="Products" />
          <KpiCard label="Aktív díjlapok" value={activeFreightSheets.length} sub={`${freightSheets.length} összesen`} icon={ClipboardList} accent="#06b6d4" link="FreightSheets" />
          <KpiCard label="Finance / Vám" value={`${mrnPending} / ${mrnClosed}`} sub="Vár / lezárt MRN" icon={ShieldCheck} accent="#e05a2b" link="Finance" />
        </div>
      </div>

      <SectionDivider label="Statisztikák & Grafikonok" />

      {/* ── SECTION 4: CHARTS ROW 1 ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Truck status donut */}
        <div className="p-5 rounded-2xl" style={cardBase}>
          <SectionTitle sub="Fuvarok státusz megoszlása" accent="#3B6CF4">Státusz megoszlás</SectionTitle>
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
        <div className="p-5 rounded-2xl" style={cardBase}>
          <SectionTitle sub="Célország szerinti fuvarok" accent="#f59e0b">Célország bontás</SectionTitle>
          {countryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={countryData} barCategoryGap="35%" layout="vertical">
                <XAxis type="number" tick={{ fill: "#8896aa", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#8896aa", fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(59,108,244,0.06)" }} />
                <Bar dataKey="value" name="Fuvar" fill="#3B6CF4" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-sm text-slate-400">Nincs adat</div>}
        </div>

        {/* Carrier breakdown */}
        <div className="p-5 rounded-2xl" style={cardBase}>
          <SectionTitle sub="Fuvarozó szerint" accent="#22c55e">Fuvarozó bontás</SectionTitle>
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

      {/* ── SECTION 5: CHARTS ROW 2 ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly trend */}
        <div className="p-5 rounded-2xl" style={cardBase}>
          <SectionTitle sub="Lezárt fuvarok havonta (darab + tonna)" accent="#e05a2b">Havi teljesítmény</SectionTitle>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B6CF4" stopOpacity={0.18}/>
                    <stop offset="95%" stopColor="#3B6CF4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.18}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" />
                <XAxis dataKey="month" tick={{ fill: "#8896aa", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fill: "#8896aa", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: "#8896aa", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#8896aa" }} />
                <Area yAxisId="left" type="monotone" dataKey="darab" name="Fuvar (db)" stroke="#3B6CF4" fill="url(#grad1)" strokeWidth={2} dot={false} />
                <Area yAxisId="right" type="monotone" dataKey="tonnas" name="Tonna (t)" stroke="#22c55e" fill="url(#grad2)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-sm text-slate-400">Nincs lezárt fuvar</div>}
        </div>

        {/* County breakdown HU */}
        <div className="p-5 rounded-2xl" style={cardBase}>
          <SectionTitle sub="Magyar célmegyék – aktív és lezárt fuvarok" accent="#06b6d4">Megye bontás (HU)</SectionTitle>
          {countyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={countyData} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#8896aa", fontSize: 9 }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" height={50} />
                <YAxis tick={{ fill: "#8896aa", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(59,108,244,0.05)" }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#8896aa" }} />
                <Bar dataKey="open" name="Nyitott" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="closed" name="Lezárt" fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-sm text-slate-400">Nincs HU szállítás</div>}
        </div>
      </div>



      {/* ── SECTION 7: RECENT TRUCKS TABLE ────────────────────── */}
      <div className="p-5 rounded-2xl" style={cardBase}>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle sub="Legutóbbi fuvarok">Legutóbbi fuvarok</SectionTitle>
          <Link to={createPageUrl("Logistics")} className="text-xs font-semibold text-blue-500 hover:underline flex items-center gap-1">
            Összes <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
                <th className="pb-2 pr-4">Rendszám</th>
                <th className="pb-2 pr-4">Termék</th>
                <th className="pb-2 pr-4">Fuvarozó</th>
                <th className="pb-2 pr-4">Célállomás</th>
                <th className="pb-2 pr-4 text-right">Tonna</th>
                <th className="pb-2">Státusz</th>
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
                  <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="py-2 pr-4 font-semibold text-slate-800">{t.truck_number || "—"}</td>
                    <td className="py-2 pr-4 text-slate-600 max-w-[120px] truncate">{t.product_name || "—"}</td>
                    <td className="py-2 pr-4 text-slate-600 max-w-[100px] truncate">{t.carrier_name || "—"}</td>
                    <td className="py-2 pr-4 text-slate-600">{t.destination_country}{t.destination_city ? ` · ${t.destination_city}` : ""}</td>
                    <td className="py-2 pr-4 text-right font-semibold text-slate-700">{t.actual_weight_tons?.toFixed(1) || t.planned_quantity_tons?.toFixed(1) || "—"}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[t.status] || "bg-slate-100 text-slate-500"}`}>
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
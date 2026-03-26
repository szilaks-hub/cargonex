import React, { useState, useMemo } from "react";
import { format, parseISO, getDay, subWeeks, subMonths, addDays } from "date-fns";
import { hu } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { AlertTriangle, TrendingUp, CalendarDays } from "lucide-react";

const WARN = 200;
const MAX  = 400;

const WEEKDAY_NAMES = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];

const PERIODS = [
  { label: "2 hét",    days: 14 },
  { label: "3 hét",    days: 21 },
  { label: "4 hét",    days: 28 },
  { label: "1 hónap",  days: 30 },
  { label: "3 hónap",  days: 90 },
  { label: "6 hónap",  days: 180 },
  { label: "1 év",     days: 365 },
];

const getColor = (tons) => {
  if (tons >= MAX) return "#ef4444";
  if (tons >= WARN) return "#f59e0b";
  return "#3b82f6";
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const label = d.date ? format(parseISO(d.date), "yyyy. MMM d. (EEEE)", { locale: hu }) : d.name;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <div className="font-semibold text-slate-800 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.fill || p.color }} className="font-medium">
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
          {p.name.includes("tonna") || p.name.includes("Átlag t") ? " t" : ""}
        </div>
      ))}
      {d.trucks !== undefined && <div className="text-slate-400 text-xs mt-1">{d.trucks} kamion</div>}
    </div>
  );
};

export default function LoadingStatsPanel({ trucks }) {
  const [periodDays, setPeriodDays] = useState(30);
  const today = useMemo(() => new Date(), []);
  const todayStr = format(today, "yyyy-MM-dd");

  // filter trucks in window (past N days to future N days, exclude cancelled)
  const windowTrucks = useMemo(() => {
    const from = format(addDays(today, -periodDays), "yyyy-MM-dd");
    const to   = format(addDays(today, periodDays), "yyyy-MM-dd");
    return trucks.filter(t => {
      if (t.status === "cancelled") return false;
      const d = (t.expected_loading_date || t.loading_date || "").slice(0, 10);
      return d >= from && d <= to;
    });
  }, [trucks, periodDays, today]);

  // Daily aggregation
  const dayMap = useMemo(() => {
    const m = {};
    windowTrucks.forEach(t => {
      const d = (t.expected_loading_date || t.loading_date || "").slice(0, 10);
      if (!d) return;
      if (!m[d]) m[d] = { date: d, tons: 0, trucks: 0, transit: 0 };
      m[d].tons   += t.planned_quantity_tons || 0;
      m[d].trucks += 1;
      if (t.transit) m[d].transit += 1;
    });
    return m;
  }, [windowTrucks]);

  const dailyData = useMemo(() =>
    Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date)),
    [dayMap]
  );

  // Top 5 busiest days
  const top5 = useMemo(() =>
    [...dailyData].sort((a, b) => b.tons - a.tons).slice(0, 5),
    [dailyData]
  );

  // Weekday analysis: group by day of week (Mon=0 ... Sun=6)
  const weekdayStats = useMemo(() => {
    const map = Array.from({ length: 7 }, () => ({ tons: 0, trucks: 0, transit: 0, count: 0 }));
    dailyData.forEach(d => {
      const dow = (getDay(parseISO(d.date)) + 6) % 7; // Mon=0
      map[dow].tons    += d.tons;
      map[dow].trucks  += d.trucks;
      map[dow].transit += d.transit;
      map[dow].count   += 1;
    });
    return map.map((v, i) => ({
      name: WEEKDAY_NAMES[i],
      avgTons:    v.count > 0 ? v.tons    / v.count : 0,
      avgTrucks:  v.count > 0 ? v.trucks  / v.count : 0,
      transitPct: v.trucks > 0 ? (v.transit / v.trucks) * 100 : 0,
      days:       v.count,
    }));
  }, [dailyData]);

  const maxAvgTons = Math.max(...weekdayStats.map(w => w.avgTons), 1);

  if (dailyData.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 shadow-sm">
        Nincs elegendő adat a kiválasztott időszakra.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-slate-600">Időszak:</span>
        <div className="flex flex-wrap gap-1">
          {PERIODS.map(p => (
            <button
              key={p.days}
              onClick={() => setPeriodDays(p.days)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                periodDays === p.days
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Daily bar chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-800">Napi rakodási terhelés</h3>
          <span className="text-xs text-slate-400 ml-1">tervezett tonna / nap (±{periodDays} nap)</span>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <XAxis dataKey="date" tickFormatter={d => format(parseISO(d), "MM/dd")}
                tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={36} tickFormatter={v => `${v}t`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(59,130,246,0.06)" }} />
              <ReferenceLine y={WARN} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1} />
              <ReferenceLine y={MAX}  stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1} />
              <Bar dataKey="tons" name="Tonna" radius={[3, 3, 0, 0]} maxBarSize={28}>
                {dailyData.map(entry => (
                  <Cell key={entry.date}
                    fill={entry.date === todayStr ? "#6366f1" : getColor(entry.tons)}
                    opacity={entry.date < todayStr ? 0.55 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 flex-wrap">
          <div className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-blue-500" /> Normal</div>
          <div className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-amber-400" /> &gt;{WARN}t</div>
          <div className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-red-500" /> &gt;{MAX}t</div>
          <div className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-indigo-500" /> Ma</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Weekday analysis */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-slate-800">Hétköznapi átlagok</h3>
            <span className="text-xs text-slate-400 ml-1">átlag tonna + tranzit arány</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayStats} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                  tickFormatter={n => n.slice(0, 3)} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={36} tickFormatter={v => `${v.toFixed(0)}t`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(59,130,246,0.06)" }} />
                <Bar dataKey="avgTons" name="Átlag tonna" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {weekdayStats.map((w, i) => (
                    <Cell key={w.name} fill={getColor(w.avgTons)} opacity={i >= 5 ? 0.5 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Table */}
          <div className="mt-3 space-y-1.5">
            {weekdayStats.map((w, i) => (
              <div key={w.name} className={`flex items-center gap-2 text-xs ${i >= 5 ? "opacity-50" : ""}`}>
                <div className="w-16 font-medium text-slate-700 flex-shrink-0">{w.name.slice(0, 3)}</div>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${(w.avgTons / maxAvgTons) * 100}%`, backgroundColor: getColor(w.avgTons) }} />
                </div>
                <div className="w-16 text-right font-bold" style={{ color: getColor(w.avgTons) }}>
                  {w.avgTons.toFixed(1)} t
                </div>
                <div className="w-20 text-right text-slate-400 flex-shrink-0">
                  {w.transitPct.toFixed(0)}% TR
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 + summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">Top 5 legterheltebb nap</h3>
            <div className="space-y-2">
              {top5.map((d, i) => {
                const pct = Math.min(100, (d.tons / MAX) * 100);
                const color = getColor(d.tons);
                const transitPct = d.trucks > 0 ? ((d.transit / d.trucks) * 100).toFixed(0) : 0;
                return (
                  <div key={d.date} className="flex items-center gap-2">
                    <div className="text-xs font-bold text-slate-400 w-5">#{i+1}</div>
                    <div className="text-xs font-medium text-slate-700 w-28 flex-shrink-0">
                      {format(parseISO(d.date), "MM. dd. (EEE)", { locale: hu })}
                    </div>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <div className="text-xs font-bold w-16 text-right flex-shrink-0" style={{ color }}>
                      {d.tons.toFixed(1)} t
                      {d.tons >= WARN && <AlertTriangle className="w-3 h-3 inline ml-0.5" />}
                    </div>
                    <div className="text-[10px] text-slate-400 w-14 text-right flex-shrink-0">{transitPct}% TR</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary stats */}
          <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-3">
            {[
              { label: "Átlag napi tonna", value: dailyData.length > 0 ? (dailyData.reduce((s,d) => s+d.tons,0)/dailyData.length).toFixed(1)+" t" : "—" },
              { label: "Max napi tonna", value: top5[0] ? top5[0].tons.toFixed(1)+" t" : "—" },
              { label: "Összes aktív nap", value: `${dailyData.length} nap` },
              { label: "Átlag tranzit arány", value: (() => {
                const totT = windowTrucks.length;
                const totTR = windowTrucks.filter(t => t.transit).length;
                return totT > 0 ? (totTR/totT*100).toFixed(1)+"%" : "—";
              })() },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-lg p-2.5">
                <div className="text-[10px] text-slate-400">{s.label}</div>
                <div className="text-base font-bold text-slate-800 mt-0.5">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
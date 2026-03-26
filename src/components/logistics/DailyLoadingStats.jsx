import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { hu } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { AlertTriangle, TrendingUp } from "lucide-react";

const WARN = 200;
const MAX  = 400;

export default function DailyLoadingStats({ trucks }) {
  const [days, setDays] = useState(30); // how many days to show

  // Build per-day aggregates (exclude cancelled, use expected or loading date)
  const dayMap = {};
  trucks.forEach(t => {
    if (t.status === "cancelled") return;
    const d = (t.expected_loading_date || t.loading_date || "").slice(0, 10);
    if (!d) return;
    if (!dayMap[d]) dayMap[d] = { date: d, tons: 0, trucks: 0 };
    dayMap[d].tons   += t.planned_quantity_tons || 0;
    dayMap[d].trucks += 1;
  });

  // Sort by date, take closest `days` days (past+future around today)
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const sorted = Object.values(dayMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter(d => {
      // Keep days within window: show from `days` days ago to `days` days future
      const diff = (new Date(d.date) - today) / 86400000;
      return diff >= -days && diff <= days;
    });

  if (sorted.length === 0) return null;

  // Top 5 busiest days
  const top5 = [...sorted].sort((a, b) => b.tons - a.tons).slice(0, 5);

  const getColor = (tons) => {
    if (tons >= MAX) return "#ef4444";
    if (tons >= WARN) return "#f59e0b";
    return "#3b82f6";
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const label = format(parseISO(d.date), "yyyy. MMM d. (EEEE)", { locale: hu });
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
        <div className="font-semibold text-slate-800 mb-1">{label}</div>
        <div className="text-blue-700 font-bold">{d.tons.toFixed(1)} t</div>
        <div className="text-slate-500">{d.trucks} kamion</div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-800">Napi rakodási terhelés</h3>
          <span className="text-xs text-slate-400">(aktív kamionok, tervezett tonna)</span>
        </div>
        <div className="flex gap-1 text-xs">
          {[14, 30, 60].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-2.5 py-1 rounded-md border transition-colors ${days === d ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
            >
              ±{d} nap
            </button>
          ))}
        </div>
      </div>

      {/* Bar chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <XAxis
              dataKey="date"
              tickFormatter={d => format(parseISO(d), "MM/dd")}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              width={36}
              tickFormatter={v => `${v}t`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(59,130,246,0.06)" }} />
            <ReferenceLine y={WARN} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1} />
            <ReferenceLine y={MAX}  stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1} />
            <Bar dataKey="tons" radius={[3, 3, 0, 0]} maxBarSize={32}>
              {sorted.map((entry) => (
                <Cell
                  key={entry.date}
                  fill={entry.date === todayStr ? "#6366f1" : getColor(entry.tons)}
                  opacity={entry.date < todayStr ? 0.55 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
        <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded bg-blue-500" /> Normal</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded bg-amber-400" /> Figyelem (&gt;{WARN}t)</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded bg-red-500" /> Túlterhelt (&gt;{MAX}t)</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded bg-indigo-500" /> Ma</div>
      </div>

      {/* Top 5 table */}
      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Top 5 legterheltebb nap</div>
        <div className="space-y-1.5">
          {top5.map((d, i) => {
            const pct = Math.min(100, (d.tons / MAX) * 100);
            const color = getColor(d.tons);
            return (
              <div key={d.date} className="flex items-center gap-3">
                <div className="text-sm font-bold text-slate-400 w-4">#{i + 1}</div>
                <div className="text-sm font-medium text-slate-700 w-32 flex-shrink-0">
                  {format(parseISO(d.date), "MM. dd. (EEE)", { locale: hu })}
                </div>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
                <div className="text-sm font-bold w-20 text-right" style={{ color }}>
                  {d.tons.toFixed(1)} t
                  {d.tons >= WARN && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                </div>
                <div className="text-xs text-slate-400 w-14 text-right">{d.trucks} kamion</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
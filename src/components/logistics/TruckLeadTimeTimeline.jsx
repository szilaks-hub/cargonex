import React, { useMemo, useState } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import { hu } from "date-fns/locale";
import { CalendarClock, ZoomIn, ZoomOut } from "lucide-react";

function safeDate(val) {
  if (!val) return null;
  try {
    const d = typeof val === "string" ? parseISO(val.slice(0, 10)) : new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function fmtDate(val) {
  const d = safeDate(val);
  if (!d) return "—";
  return format(d, "yyyy. MM. dd.", { locale: hu });
}

function barColor(days) {
  if (days <= 3) return "#22c55e";
  if (days <= 7) return "#3b82f6";
  if (days <= 14) return "#f59e0b";
  if (days <= 30) return "#f97316";
  return "#ef4444";
}

/**
 * Gantt-style timeline: each truck is a horizontal bar from created_date to mrn_date
 * on a shared time axis.
 */
export default function TruckLeadTimeTimeline({ trucks }) {
  const [maxBars, setMaxBars] = useState(25);

  const data = useMemo(() => {
    return trucks
      .map(t => {
        const created = safeDate(t.created);
        const mrn = safeDate(t.mrnDate);
        if (!created || !mrn) return null;
        return {
          id: t.id,
          truckNumber: t.truckNumber,
          orderNo: t.orderNo,
          created,
          mrn,
          leadDays: differenceInDays(mrn, created),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.created - a.created);
  }, [trucks]);

  const { minDate, maxDate, totalDays, ticks } = useMemo(() => {
    if (data.length === 0) return { minDate: null, maxDate: null, totalDays: 0, ticks: [] };
    const minD = data.reduce((min, t) => (t.created < min ? t.created : min), data[0].created);
    const maxD = data.reduce((max, t) => (t.mrn > max ? t.mrn : max), data[0].mrn);
    const pad = Math.ceil((maxD - minD) / (1000 * 60 * 60 * 24) * 0.05);
    const minDate = new Date(minD); minDate.setDate(minDate.getDate() - pad);
    const maxDate = new Date(maxD); maxDate.setDate(maxDate.getDate() + pad);
    const totalDays = Math.max(1, differenceInDays(maxDate, minDate));

    // Generate ~8 tick marks
    const ticks = [];
    const tickCount = Math.min(8, totalDays);
    for (let i = 0; i <= tickCount; i++) {
      const d = new Date(minD);
      d.setDate(d.getDate() + Math.round((totalDays / tickCount) * i));
      ticks.push({ date: d, pct: (differenceInDays(d, minDate) / totalDays) * 100 });
    }
    return { minDate, maxDate, totalDays, ticks };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        Nincs kamion beírás → MRN adat az idővonalhoz.
      </div>
    );
  }

  const visible = data.slice(0, maxBars);
  const rowH = 26;
  const chartH = visible.length * rowH + 30;

  const dateToPct = (d) => (differenceInDays(d, minDate) / totalDays) * 100;

  return (
    <div className="px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-purple-50/40">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-semibold text-slate-700">Idővonal – Kamion átfutás</span>
          <span className="text-xs text-slate-400">created_date → mrn_date (Gantt)</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setMaxBars(v => Math.max(10, v - 10))}
            className="px-2 py-0.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1"
          >
            <ZoomOut className="w-3 h-3" /> Kevesebb
          </button>
          <span className="text-slate-400 px-1">{visible.length}/{data.length}</span>
          <button
            onClick={() => setMaxBars(v => Math.min(data.length, v + 10))}
            className="px-2 py-0.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1"
          >
            <ZoomIn className="w-3 h-3" /> Több
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 700 }}>
          {/* Legend */}
          <div className="flex items-center gap-3 mb-2 text-[10px] text-slate-500 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm inline-block" style={{ background: "#22c55e" }} /> ≤3 nap</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm inline-block" style={{ background: "#3b82f6" }} /> ≤7 nap</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm inline-block" style={{ background: "#f59e0b" }} /> ≤14 nap</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm inline-block" style={{ background: "#f97316" }} /> ≤30 nap</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm inline-block" style={{ background: "#ef4444" }} /> &gt;30 nap</span>
          </div>

          {/* Chart */}
          <svg width="100%" height={chartH} style={{ display: "block" }}>
            {/* Tick grid lines + labels */}
            {ticks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={`${tick.pct}%`} x2={`${tick.pct}%`}
                  y1={0} y2={chartH - 18}
                  stroke="#e2e8f0" strokeWidth={1} strokeDasharray="3 3"
                />
                <text
                  x={`${tick.pct}%`} y={chartH - 6}
                  textAnchor={tick.pct < 5 ? "start" : tick.pct > 95 ? "end" : "middle"}
                  fontSize={9} fill="#94a3b8"
                >
                  {format(tick.date, "MM. dd.", { locale: hu })}
                </text>
              </g>
            ))}

            {/* Truck bars */}
            {visible.map((t, idx) => {
              const y = idx * rowH + 2;
              const startX = dateToPct(t.created);
              const endX = dateToPct(t.mrn);
              const width = Math.max(0.5, endX - startX);
              const color = barColor(t.leadDays);
              const labelLeft = startX < 60;

              return (
                <g key={t.id}>
                  {/* Truck label (left side) */}
                  <text
                    x={4} y={y + 13}
                    fontSize={9} fill="#475569" fontWeight={600}
                  >
                    {t.truckNumber} · {t.leadDays}n
                  </text>

                  {/* Bar */}
                  <rect
                    x={`${startX}%`} y={y}
                    width={`${width}%`} height={16}
                    rx={3}
                    fill={color}
                    opacity={0.85}
                  >
                    <title>{`${t.truckNumber} (${t.orderNo})\nBeírás: ${fmtDate(t.created)}\nMRN: ${fmtDate(t.mrn)}\nÁtfutás: ${t.leadDays} nap`}</title>
                  </rect>

                  {/* Date labels at bar ends */}
                  {width > 8 && (
                    <text
                      x={`${labelLeft ? endX + 0.5 : startX - 0.5}%`}
                      y={y + 12}
                      fontSize={7.5}
                      fill="#64748b"
                      textAnchor={labelLeft ? "start" : "end"}
                    >
                      {labelLeft ? format(t.mrn, "MM.dd") : format(t.created, "MM.dd")}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
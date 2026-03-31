import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday,
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
  startOfWeek, endOfWeek, getDay, isSameDay
} from "date-fns";
import { hu } from "date-fns/locale";

const DAY_CAPACITY_WARN = 200;
const DAY_CAPACITY_MAX  = 400;

const STATUS_COLORS = {
  booked:          "bg-blue-100 border-blue-300 text-blue-800",
  loaded:          "bg-orange-100 border-orange-300 text-orange-800",
  finance_control: "bg-yellow-100 border-yellow-300 text-yellow-800",
  closed:          "bg-green-100 border-green-300 text-green-800",
  cancelled:       "bg-red-100 border-red-300 text-red-600 opacity-60",
};
const STATUS_DOT = {
  booked: "bg-blue-500", loaded: "bg-orange-500",
  finance_control: "bg-yellow-500", closed: "bg-green-500", cancelled: "bg-red-400",
};

const WEEKDAYS_SHORT = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];
const WEEKDAYS_LONG  = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];

export default function LogisticsCalendar({ trucks, onEdit }) {
  const [calView, setCalView] = useState("month"); // "month" | "week" | "day"
  const [cursor, setCursor] = useState(new Date());
  const [draggingTruck, setDraggingTruck] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  // --- helpers ---
  const trucksByDate = {};
  trucks.forEach(t => {
    const d = (t.expected_loading_date || t.loading_date || "").slice(0, 10);
    if (!d) return;
    if (!trucksByDate[d]) trucksByDate[d] = [];
    trucksByDate[d].push(t);
  });

  const tonsByDate = {};
  Object.entries(trucksByDate).forEach(([date, ts]) => {
    tonsByDate[date] = ts.filter(t => t.status !== "cancelled")
      .reduce((s, t) => s + (t.planned_quantity_tons || 0), 0);
  });

  const getTonsBg = (dateStr) => {
    const t = tonsByDate[dateStr] || 0;
    if (t >= DAY_CAPACITY_MAX) return "bg-red-50";
    if (t >= DAY_CAPACITY_WARN) return "bg-yellow-50";
    return "bg-white";
  };
  const getTonsColor = (t) => {
    if (t >= DAY_CAPACITY_MAX) return "text-red-600 font-bold";
    if (t >= DAY_CAPACITY_WARN) return "text-yellow-600 font-semibold";
    return "text-slate-400";
  };

  // --- navigation ---
  const navigate = (dir) => {
    if (calView === "month") setCursor(c => dir > 0 ? addMonths(c, 1) : subMonths(c, 1));
    if (calView === "week")  setCursor(c => dir > 0 ? addWeeks(c, 1)  : subWeeks(c, 1));
    if (calView === "day")   setCursor(c => dir > 0 ? addDays(c, 1)   : subDays(c, 1));
  };

  const navLabel = () => {
    if (calView === "month") return format(cursor, "yyyy. MMMM", { locale: hu });
    if (calView === "week") {
      const ws = startOfWeek(cursor, { weekStartsOn: 1 });
      const we = endOfWeek(cursor, { weekStartsOn: 1 });
      return `${format(ws, "MMM d", { locale: hu })} – ${format(we, "MMM d.", { locale: hu })}`;
    }
    return format(cursor, "yyyy. MMMM d. (EEEE)", { locale: hu });
  };

  // --- drag & drop ---
  const handleDragStart = (truck, e) => {
    setDraggingTruck(truck);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragEnd = () => { setDraggingTruck(null); setDragOverDate(null); };
  const handleDragOver = (dateStr, e) => { e.preventDefault(); setDragOverDate(dateStr); };
  const handleDrop = async (dateStr, e) => {
    e.preventDefault();
    if (!draggingTruck || ["closed","cancelled"].includes(draggingTruck.status)) {
      setDraggingTruck(null); setDragOverDate(null); return;
    }
    const old = (draggingTruck.expected_loading_date || draggingTruck.loading_date || "").slice(0,10);
    if (old === dateStr) { setDraggingTruck(null); setDragOverDate(null); return; }
    setSaving(true);
    try {
      const upd = { loading_date: dateStr };
      if (draggingTruck.expected_loading_date) upd.expected_loading_date = dateStr;
      await base44.entities.Truck.update(draggingTruck.id, upd);
      qc.invalidateQueries({ queryKey: ["trucks"] });
      toast.success(`${draggingTruck.truck_number || "Kamion"} → ${dateStr}`);
    } catch { toast.error("Nem sikerült a dátum módosítása"); }
    setSaving(false); setDraggingTruck(null); setDragOverDate(null);
  };

  // --- truck card (reused across views) ---
  const TruckChip = ({ truck, compact = false }) => (
    <div
      key={truck.id}
      draggable={!["closed","cancelled"].includes(truck.status)}
      onDragStart={(e) => handleDragStart(truck, e)}
      onDragEnd={handleDragEnd}
      onClick={() => onEdit(truck)}
      className={`rounded border px-1.5 py-0.5 flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity
        ${compact ? "text-[10px]" : "text-xs"}
        ${STATUS_COLORS[truck.status] || "bg-slate-100 border-slate-200 text-slate-700"}
        ${draggingTruck?.id === truck.id ? "opacity-40" : ""}
        ${!["closed","cancelled"].includes(truck.status) ? "cursor-grab active:cursor-grabbing" : ""}
      `}
      title={`${truck.truck_number || "—"} · ${truck.carrier_name || ""} · ${truck.planned_quantity_tons || 0}t · ${truck.destination_country || ""}`}
    >
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[truck.status] || "bg-slate-400"}`} />
      <span className="font-semibold truncate">{truck.truck_number || truck.orderbook_no || "—"}</span>
      {!compact && truck.carrier_name && <span className="text-[10px] opacity-60 truncate">{truck.carrier_name}</span>}
      <span className="flex-shrink-0 opacity-70 ml-auto">{truck.planned_quantity_tons || 0}t</span>
    </div>
  );

  // ---- MONTH VIEW ----
  const MonthView = () => {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startPad = (getDay(monthStart) + 6) % 7;
    const paddedDays = [...Array(startPad).fill(null), ...days];

    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200">
          {WEEKDAYS_SHORT.map((d, i) => (
            <div key={d} className={`text-center text-xs font-bold py-2 ${i >= 5 ? "text-red-400" : "text-slate-500"}`}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {paddedDays.map((day, idx) => {
            if (!day) return <div key={`pad-${idx}`} className="border-b border-r border-slate-100 bg-slate-50 min-h-[110px]" />;
            const dateStr = format(day, "yyyy-MM-dd");
            const dayTrucks = trucksByDate[dateStr] || [];
            const tons = tonsByDate[dateStr] || 0;
            const dow = (getDay(day) + 6) % 7;
            const isWeekend = dow >= 5;
            const isDragOver = dragOverDate === dateStr;
            return (
              <div
                key={dateStr}
                className={`border-b border-r border-slate-100 min-h-[110px] p-1.5 transition-all
                  ${getTonsBg(dateStr)}
                  ${isDragOver ? "ring-2 ring-blue-400 ring-inset bg-blue-50" : ""}
                  ${isWeekend && isSameMonth(day, cursor) ? "bg-slate-50/80" : ""}
                  ${!isSameMonth(day, cursor) ? "bg-slate-50 opacity-50" : ""}
                `}
                onDragOver={(e) => handleDragOver(dateStr, e)}
                onDrop={(e) => handleDrop(dateStr, e)}
                onDragLeave={() => setDragOverDate(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center
                    ${isToday(day) ? "bg-blue-600 text-white" : isWeekend ? "text-red-400" : "text-slate-700"}`}>
                    {format(day, "d")}
                  </span>
                  {tons > 0 && (
                    <span className={`text-[10px] flex items-center gap-0.5 ${getTonsColor(tons)}`}>
                      {tons >= DAY_CAPACITY_WARN && <AlertTriangle className="w-2.5 h-2.5" />}
                      {tons.toFixed(0)}t
                    </span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {dayTrucks.slice(0, 4).map(t => <TruckChip key={t.id} truck={t} compact />)}
                  {dayTrucks.length > 4 && <div className="text-[10px] text-slate-400 text-center">+{dayTrucks.length - 4} további</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ---- WEEK VIEW ----
  const WeekView = () => {
    const ws = startOfWeek(cursor, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(ws, i));

    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200">
          {weekDays.map((day, i) => {
            const isWeekend = i >= 5;
            return (
              <div key={i} className={`text-center py-2 ${isWeekend ? "text-red-400" : "text-slate-600"}`}>
                <div className="text-[11px] font-semibold">{WEEKDAYS_LONG[i]}</div>
                <div className={`text-lg font-bold mt-0.5 w-9 h-9 rounded-full flex items-center justify-center mx-auto
                  ${isToday(day) ? "bg-blue-600 text-white" : ""}`}>
                  {format(day, "d")}
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-7 min-h-[300px]">
          {weekDays.map((day, i) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayTrucks = trucksByDate[dateStr] || [];
            const tons = tonsByDate[dateStr] || 0;
            const isDragOver = dragOverDate === dateStr;
            const isWeekend = i >= 5;
            return (
              <div
                key={dateStr}
                className={`border-r border-slate-100 p-2 transition-all min-h-[300px]
                  ${getTonsBg(dateStr)}
                  ${isDragOver ? "ring-2 ring-blue-400 ring-inset bg-blue-50" : ""}
                  ${isWeekend ? "bg-slate-50/60" : ""}
                `}
                onDragOver={(e) => handleDragOver(dateStr, e)}
                onDrop={(e) => handleDrop(dateStr, e)}
                onDragLeave={() => setDragOverDate(null)}
              >
                {tons > 0 && (
                  <div className={`text-[11px] mb-2 flex items-center gap-1 ${getTonsColor(tons)}`}>
                    {tons >= DAY_CAPACITY_WARN && <AlertTriangle className="w-3 h-3" />}
                    <span>{tons.toFixed(1)} t</span>
                  </div>
                )}
                <div className="space-y-1">
                  {dayTrucks.map(t => <TruckChip key={t.id} truck={t} />)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ---- DAY VIEW ----
  const DayView = () => {
    const dateStr = format(cursor, "yyyy-MM-dd");
    const dayTrucks = trucksByDate[dateStr] || [];
    const tons = tonsByDate[dateStr] || 0;
    const isDragOver = dragOverDate === dateStr;

    return (
      <div
        className={`border border-slate-200 rounded-xl overflow-hidden shadow-sm p-4 transition-all min-h-[300px]
          ${getTonsBg(dateStr)}
          ${isDragOver ? "ring-2 ring-blue-400 ring-inset bg-blue-50" : ""}
        `}
        onDragOver={(e) => handleDragOver(dateStr, e)}
        onDrop={(e) => handleDrop(dateStr, e)}
        onDragLeave={() => setDragOverDate(null)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-slate-600">
            {dayTrucks.length} kamion
          </div>
          {tons > 0 && (
            <div className={`text-sm flex items-center gap-1 ${getTonsColor(tons)}`}>
              {tons >= DAY_CAPACITY_WARN && <AlertTriangle className="w-4 h-4" />}
              <span className="font-bold">{tons.toFixed(1)} t</span>
              <span className="text-slate-400 font-normal">tervezett</span>
            </div>
          )}
        </div>
        {dayTrucks.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">Nincs kamion erre a napra</div>
        ) : (
          <div className="space-y-2">
            {dayTrucks.map(truck => (
              <div
                key={truck.id}
                draggable={!["closed","cancelled"].includes(truck.status)}
                onDragStart={(e) => handleDragStart(truck, e)}
                onDragEnd={handleDragEnd}
                onClick={() => onEdit(truck)}
                className={`rounded-lg border px-4 py-3 flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity
                  ${STATUS_COLORS[truck.status] || "bg-slate-100 border-slate-200 text-slate-700"}
                  ${draggingTruck?.id === truck.id ? "opacity-40" : ""}
                  ${!["closed","cancelled"].includes(truck.status) ? "cursor-grab active:cursor-grabbing" : ""}
                `}
              >
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${STATUS_DOT[truck.status] || "bg-slate-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{truck.truck_number || "—"}</div>
                  <div className="text-xs opacity-70 mt-0.5">
                    {truck.carrier_name || "—"}{truck.destination_country ? ` · ${truck.destination_country}` : ""}{truck.destination_city ? ` · ${truck.destination_city}` : ""}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold">{truck.planned_quantity_tons || 0} t</div>
                  {truck.orderbook_no && <div className="text-xs opacity-60">{truck.orderbook_no}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // --- weekday averages ---
  const weekdayStats = Array.from({ length: 7 }, (_, dow) => {
    // dow: 0=Mon...6=Sun (ISO weekday offset)
    const daysWithData = Object.entries(trucksByDate).filter(([dateStr]) => {
      const d = new Date(dateStr);
      return (getDay(d) + 6) % 7 === dow;
    });
    const totalCount = daysWithData.reduce((s, [, ts]) => s + ts.filter(t => t.status !== "cancelled").length, 0);
    const totalTons = daysWithData.reduce((s, [, ts]) => s + ts.filter(t => t.status !== "cancelled").reduce((ss, t) => ss + (t.planned_quantity_tons || 0), 0), 0);
    const n = daysWithData.length || 1;
    return { avgCount: totalCount / n, avgTons: totalTons / n, days: daysWithData.length };
  });

  return (
    <div className="space-y-4">
      {/* Weekday averages summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        <div className="text-xs font-semibold text-slate-500 mb-2">Hétköznapi átlag (összes adat alapján)</div>
        <div className="flex gap-4 items-start">
          <div className="grid grid-cols-7 gap-1 flex-1">
            {WEEKDAYS_SHORT.map((wd, i) => (
              <div key={i} className={`text-center rounded-lg p-2 ${i >= 5 ? "bg-slate-50 border border-slate-100" : "bg-blue-50 border border-blue-100"}`}>
                <div className={`text-[11px] font-bold mb-1 ${i >= 5 ? "text-slate-400" : "text-blue-700"}`}>{wd}</div>
                <div className={`text-sm font-bold ${i >= 5 ? "text-slate-400" : "text-slate-800"}`}>{weekdayStats[i].avgCount.toFixed(1)}<span className="text-[9px] font-normal text-slate-400 ml-0.5">db</span></div>
                <div className={`text-[11px] ${i >= 5 ? "text-slate-300" : "text-blue-600 font-semibold"}`}>{weekdayStats[i].avgTons.toFixed(0)}t</div>
              </div>
            ))}
          </div>
          {/* Mini chart */}
          <div className="w-48 shrink-0">
            <div className="text-[10px] text-slate-400 mb-1 text-center">Átl. tonna / nap</div>
            <ResponsiveContainer width="100%" height={64}>
              <BarChart data={WEEKDAYS_SHORT.map((wd, i) => ({ name: wd, tons: parseFloat(weekdayStats[i].avgTons.toFixed(1)), count: parseFloat(weekdayStats[i].avgCount.toFixed(1)) }))} barSize={14} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ fontSize: 11, padding: "4px 8px", borderRadius: 6 }}
                  formatter={(val, name) => [val, name === "tons" ? "tonna" : "db"]}
                />
                <Bar dataKey="tons" radius={[3, 3, 0, 0]}>
                  {WEEKDAYS_SHORT.map((_, i) => (
                    <Cell key={i} fill={i >= 5 ? "#cbd5e1" : "#3b82f6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <h2 className="text-base font-bold text-slate-800 min-w-[200px] text-center">{navLabel()}</h2>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}><ChevronRight className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())} className="text-xs">Ma</Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" /><span>&gt;{DAY_CAPACITY_WARN}t</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-100 border border-red-300" /><span>&gt;{DAY_CAPACITY_MAX}t</span></div>
          </div>
          {/* View switcher */}
          <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white text-sm">
            {[["month","Hónap"],["week","Hét"],["day","Nap"]].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setCalView(v)}
                className={`px-3 py-1.5 transition-colors ${calView === v ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >{label}</button>
            ))}
          </div>
        </div>
      </div>

      {saving && <div className="text-xs text-blue-600 text-center animate-pulse">Mentés...</div>}

      {calView === "month" && <MonthView />}
      {calView === "week"  && <WeekView />}
      {calView === "day"   && <DayView />}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        {Object.entries({ booked: "Előjegyzett", loaded: "Megrakott", finance_control: "Pénzügyi", closed: "Lezárt" }).map(([s, l]) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[s]}`} /><span>{l}</span>
          </div>
        ))}
        <span className="text-slate-300 ml-2">· Húzd a kamionokat az átütemezéshez</span>
      </div>
    </div>
  );
}
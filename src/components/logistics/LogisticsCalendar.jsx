import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Truck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, parseISO, getDay } from "date-fns";
import { hu } from "date-fns/locale";

const DAY_CAPACITY_WARN = 200;  // tons/day warning threshold
const DAY_CAPACITY_MAX  = 400;  // tons/day danger threshold

const STATUS_COLORS = {
  booked: "bg-blue-100 border-blue-300 text-blue-800",
  loaded: "bg-orange-100 border-orange-300 text-orange-800",
  finance_control: "bg-yellow-100 border-yellow-300 text-yellow-800",
  closed: "bg-green-100 border-green-300 text-green-800",
  cancelled: "bg-red-100 border-red-300 text-red-600 opacity-60",
};

const STATUS_DOT = {
  booked: "bg-blue-500",
  loaded: "bg-orange-500",
  finance_control: "bg-yellow-500",
  closed: "bg-green-500",
  cancelled: "bg-red-400",
};

export default function LogisticsCalendar({ trucks, onEdit }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [draggingTruck, setDraggingTruck] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad days to start on Monday
  const startPad = (getDay(monthStart) + 6) % 7; // 0=Mon
  const paddedDays = [...Array(startPad).fill(null), ...days];

  // Group trucks by date (use expected_loading_date if set, else loading_date)
  const trucksByDate = {};
  trucks.forEach(t => {
    const d = t.expected_loading_date || t.loading_date;
    if (!d) return;
    const key = d.slice(0, 10);
    if (!trucksByDate[key]) trucksByDate[key] = [];
    trucksByDate[key].push(t);
  });

  // Daily tonnage totals
  const tonsByDate = {};
  Object.entries(trucksByDate).forEach(([date, ts]) => {
    tonsByDate[date] = ts
      .filter(t => t.status !== "cancelled")
      .reduce((s, t) => s + (t.planned_quantity_tons || 0), 0);
  });

  const handleDragStart = (truck, e) => {
    setDraggingTruck(truck);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (dateStr, e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDate(dateStr);
  };

  const handleDrop = async (dateStr, e) => {
    e.preventDefault();
    if (!draggingTruck || draggingTruck.status === "closed" || draggingTruck.status === "cancelled") {
      setDraggingTruck(null);
      setDragOverDate(null);
      return;
    }
    const oldDate = (draggingTruck.expected_loading_date || draggingTruck.loading_date || "").slice(0, 10);
    if (oldDate === dateStr) {
      setDraggingTruck(null);
      setDragOverDate(null);
      return;
    }
    setSaving(true);
    try {
      const updateData = { loading_date: dateStr };
      if (draggingTruck.expected_loading_date) updateData.expected_loading_date = dateStr;
      await base44.entities.Truck.update(draggingTruck.id, updateData);
      qc.invalidateQueries({ queryKey: ["trucks"] });
      toast.success(`${draggingTruck.truck_number || "Kamion"} → ${dateStr}`);
    } catch {
      toast.error("Nem sikerült a dátum módosítása");
    }
    setSaving(false);
    setDraggingTruck(null);
    setDragOverDate(null);
  };

  const handleDragEnd = () => {
    setDraggingTruck(null);
    setDragOverDate(null);
  };

  const getDayBg = (dateStr, isCurrentMonth) => {
    if (!isCurrentMonth) return "bg-slate-50";
    const tons = tonsByDate[dateStr] || 0;
    if (tons >= DAY_CAPACITY_MAX) return "bg-red-50";
    if (tons >= DAY_CAPACITY_WARN) return "bg-yellow-50";
    return "bg-white";
  };

  const getTonsColor = (tons) => {
    if (tons >= DAY_CAPACITY_MAX) return "text-red-600 font-bold";
    if (tons >= DAY_CAPACITY_WARN) return "text-yellow-600 font-semibold";
    return "text-slate-400";
  };

  const WEEKDAYS = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-bold text-slate-800 min-w-[160px] text-center">
            {format(currentMonth, "yyyy. MMMM", { locale: hu })}
          </h2>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())} className="text-xs">
            Ma
          </Button>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" /><span>Figyelem (&gt;{DAY_CAPACITY_WARN}t)</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-100 border border-red-300" /><span>Túl sok (&gt;{DAY_CAPACITY_MAX}t)</span></div>
        </div>
      </div>

      {saving && <div className="text-xs text-blue-600 text-center animate-pulse">Mentés...</div>}

      {/* Calendar grid */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200">
          {WEEKDAYS.map(d => (
            <div key={d} className={`text-center text-xs font-bold py-2 ${d === "Szo" || d === "V" ? "text-red-400" : "text-slate-500"}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {paddedDays.map((day, idx) => {
            if (!day) {
              return <div key={`pad-${idx}`} className="border-b border-r border-slate-100 bg-slate-50 min-h-[110px]" />;
            }
            const dateStr = format(day, "yyyy-MM-dd");
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const dayTrucks = trucksByDate[dateStr] || [];
            const tons = tonsByDate[dateStr] || 0;
            const isDragOver = dragOverDate === dateStr;
            const dayOfWeek = (getDay(day) + 6) % 7; // 0=Mon
            const isWeekend = dayOfWeek >= 5;

            return (
              <div
                key={dateStr}
                className={`border-b border-r border-slate-100 min-h-[110px] p-1.5 transition-all
                  ${getDayBg(dateStr, isCurrentMonth)}
                  ${isDragOver ? "ring-2 ring-blue-400 ring-inset bg-blue-50" : ""}
                  ${isWeekend && isCurrentMonth ? "bg-slate-50/60" : ""}
                `}
                onDragOver={(e) => handleDragOver(dateStr, e)}
                onDrop={(e) => handleDrop(dateStr, e)}
                onDragLeave={() => setDragOverDate(null)}
              >
                {/* Day number + tons */}
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center
                    ${isToday(day) ? "bg-blue-600 text-white" : isCurrentMonth ? (isWeekend ? "text-red-400" : "text-slate-700") : "text-slate-300"}
                  `}>
                    {format(day, "d")}
                  </span>
                  {tons > 0 && (
                    <span className={`text-[10px] flex items-center gap-0.5 ${getTonsColor(tons)}`}>
                      {tons >= DAY_CAPACITY_WARN && <AlertTriangle className="w-2.5 h-2.5" />}
                      {tons.toFixed(0)}t
                    </span>
                  )}
                </div>

                {/* Trucks */}
                <div className="space-y-0.5">
                  {dayTrucks.slice(0, 4).map(truck => (
                    <div
                      key={truck.id}
                      draggable={truck.status !== "closed" && truck.status !== "cancelled"}
                      onDragStart={(e) => handleDragStart(truck, e)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onEdit(truck)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border cursor-pointer
                        flex items-center gap-1 truncate group
                        ${STATUS_COLORS[truck.status] || "bg-slate-100 border-slate-200 text-slate-700"}
                        ${draggingTruck?.id === truck.id ? "opacity-40" : "hover:opacity-80"}
                        ${truck.status !== "closed" && truck.status !== "cancelled" ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}
                      `}
                      title={`${truck.truck_number || "—"} · ${truck.carrier_name || ""} · ${truck.planned_quantity_tons || 0}t · ${truck.destination_country || ""}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[truck.status] || "bg-slate-400"}`} />
                      <span className="truncate font-medium">
                        {truck.truck_number || truck.orderbook_no || "—"}
                      </span>
                      {truck.planned_quantity_tons > 0 && (
                        <span className="flex-shrink-0 opacity-70">{truck.planned_quantity_tons}t</span>
                      )}
                    </div>
                  ))}
                  {dayTrucks.length > 4 && (
                    <div className="text-[10px] text-slate-400 text-center">
                      +{dayTrucks.length - 4} további
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        {Object.entries({ booked: "Előjegyzett", loaded: "Megrakott", finance_control: "Pénzügyi", closed: "Lezárt" }).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[status]}`} />
            <span>{label}</span>
          </div>
        ))}
        <span className="text-slate-300 ml-2">· Húzd a kamionokat az átütemezéshez</span>
      </div>
    </div>
  );
}
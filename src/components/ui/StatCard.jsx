import React from "react";

const colors = {
  blue:   { bg: "bg-blue-600",   light: "bg-blue-50",   text: "text-blue-600",   border: "border-blue-100" },
  red:    { bg: "bg-red-500",    light: "bg-red-50",    text: "text-red-600",    border: "border-red-100" },
  orange: { bg: "bg-orange-500", light: "bg-orange-50", text: "text-orange-600", border: "border-orange-100" },
  green:  { bg: "bg-emerald-500",light: "bg-emerald-50",text: "text-emerald-600",border: "border-emerald-100" },
  purple: { bg: "bg-violet-500", light: "bg-violet-50", text: "text-violet-600", border: "border-violet-100" },
  steel:  { bg: "bg-slate-500",  light: "bg-slate-50",  text: "text-slate-600",  border: "border-slate-200" },
};

export default function StatCard({ title, value, subtitle, icon: Icon, color = "blue" }) {
  const c = colors[color] || colors.blue;

  return (
    <div className={`rounded-xl border ${c.border} p-5 shadow-sm cx-card`} style={{ background: "#f0f2f5" }}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1.5 truncate">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`${c.light} p-2.5 rounded-lg ml-3 flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${c.text}`} />
          </div>
        )}
      </div>
    </div>
  );
}
import React from "react";

export default function StatCard({ title, value, icon: Icon, color = "blue", subtitle }) {
  const colorMap = {
    blue: { bg: "from-blue-600/10 to-blue-600/5", border: "border-blue-500/20", icon: "text-blue-400", glow: "shadow-blue-500/10" },
    red: { bg: "from-red-600/10 to-red-600/5", border: "border-red-500/20", icon: "text-red-400", glow: "shadow-red-500/10" },
    orange: { bg: "from-orange-600/10 to-orange-600/5", border: "border-orange-500/20", icon: "text-orange-400", glow: "shadow-orange-500/10" },
    green: { bg: "from-green-600/10 to-green-600/5", border: "border-green-500/20", icon: "text-green-400", glow: "shadow-green-500/10" },
    steel: { bg: "from-gray-600/10 to-gray-600/5", border: "border-gray-500/20", icon: "text-gray-400", glow: "shadow-gray-500/10" },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`steel-glow glow-border bg-gradient-to-br ${c.bg} border ${c.border} rounded-xl p-5 transition-all duration-300 hover:shadow-lg ${c.glow}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[#8b949e] uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold mt-1 text-[#e6edf3]">{value}</p>
          {subtitle && <p className="text-xs text-[#8b949e] mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg bg-[#22272e] border border-[#2d333b]`}>
            <Icon className={`w-5 h-5 ${c.icon}`} />
          </div>
        )}
      </div>
    </div>
  );
}
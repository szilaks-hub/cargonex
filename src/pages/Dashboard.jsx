import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import StatCard from "@/components/ui/StatCard";
import { Truck, Package, ShieldCheck, DollarSign, MapPin, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#3b82f6", "#ef4444", "#f97316", "#22c55e", "#8b5cf6", "#06b6d4"];

export default function Dashboard() {
  const { data: trucks = [] } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => base44.entities.Truck.list(),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.PurchaseOrder.list(),
  });

  const { data: partners = [] } = useQuery({
    queryKey: ["partners"],
    queryFn: () => base44.entities.Partner.list(),
  });

  const openTrucks = trucks.filter((t) => t.status !== "closed" && t.status !== "cancelled");
  const loadedWaiting = trucks.filter((t) => t.status === "loaded" || t.status === "customs");
  const now = new Date();
  const thisMonth = trucks.filter((t) => {
    if (!t.closed_date) return false;
    const d = new Date(t.closed_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalCustomsValue = thisMonth.reduce((s, t) => s + (t.calculated_customs_value || 0), 0);
  const totalFreight = thisMonth.reduce((s, t) => s + (t.foreign_freight || 0) + (t.domestic_freight || 0), 0);

  // Country breakdown
  const countryMap = {};
  trucks.forEach((t) => {
    if (t.destination_country) {
      countryMap[t.destination_country] = (countryMap[t.destination_country] || 0) + 1;
    }
  });
  const countryData = Object.entries(countryMap).map(([name, value]) => ({ name, value }));

  // Carrier breakdown
  const carrierMap = {};
  trucks.forEach((t) => {
    if (t.carrier_name) {
      carrierMap[t.carrier_name] = (carrierMap[t.carrier_name] || 0) + 1;
    }
  });
  const carrierData = Object.entries(carrierMap).map(([name, value]) => ({ name, value }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 shadow-md">
          <p className="font-semibold">{label || payload[0].name}</p>
          <p className="text-slate-500">{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard title="Open Trucks / Nyitott" value={openTrucks.length} icon={Truck} color="blue" />
        <StatCard title="Loaded + Customs / Vámra vár" value={loadedWaiting.length} icon={ShieldCheck} color="orange" />
        <StatCard title="Closed This Month / Lezárt" value={thisMonth.length} icon={Package} color="green" />
        <StatCard title="Partners / Partnerek" value={partners.length} icon={Users} color="steel" />
        <StatCard
          title="Customs Value / Vámérték (month)"
          value={totalCustomsValue.toLocaleString("hu-HU", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
          icon={DollarSign}
          color="blue"
        />
        <StatCard
          title="Total Freight / Fuvardíj (month)"
          value={totalFreight.toLocaleString("hu-HU", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
          icon={MapPin}
          color="red"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Country breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Country Breakdown / Ország bontás
          </h3>
          {countryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={countryData}>
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm">
              No data / Nincs adat
            </div>
          )}
        </div>

        {/* Carrier breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Carrier Breakdown / Fuvarozó bontás
          </h3>
          {carrierData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={carrierData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} strokeWidth={2} stroke="#fff">
                  {carrierData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm">
              No data / Nincs adat
            </div>
          )}
          {carrierData.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-3">
              {carrierData.map((c, i) => (
                <div key={c.name} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {c.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
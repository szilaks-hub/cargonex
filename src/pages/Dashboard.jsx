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

  const cardStyle = {
    background: "#ffffff",
    border: "1px solid #E8ECF4",
    borderRadius: "16px",
    boxShadow: "0 2px 12px rgba(15,23,60,0.06)",
  };

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Delivery Tracking Overview</h1>
        <p className="text-sm mt-0.5 text-slate-500">Logistics management & shipment overview — CARGONEX</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Nyitott fuvar", value: openTrucks.length, icon: Truck, accent: "#4f8ef7" },
          { label: "Vámra vár", value: loadedWaiting.length, icon: ShieldCheck, accent: "#f59e0b" },
          { label: "Lezárt (hó)", value: thisMonth.length, icon: Package, accent: "#22c55e" },
          { label: "Partnerek", value: partners.length, icon: Users, accent: "#8b5cf6" },
          {
            label: "Vámérték (hó)",
            value: totalCustomsValue > 0
              ? (totalCustomsValue / 1000).toFixed(1) + "k €"
              : "—",
            icon: DollarSign,
            accent: "#4f8ef7"
          },
          {
            label: "Fuvardíj (hó)",
            value: totalFreight > 0
              ? (totalFreight / 1000).toFixed(1) + "k €"
              : "—",
            icon: MapPin,
            accent: "#e05a2b"
          },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-2xl flex flex-col gap-3" style={cardStyle}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: "#8896aa" }}>{s.label}</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: s.accent + "22" }}>
                <s.icon className="w-4 h-4" style={{ color: s.accent }} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-800">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Country breakdown */}
        <div className="p-5 rounded-2xl" style={cardStyle}>
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-5 text-slate-500">
           Country Breakdown / Ország bontás
          </h3>
          {countryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={countryData} barCategoryGap="35%">
                <XAxis dataKey="name" tick={{ fill: "#8896aa", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8896aa", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(59,108,244,0.06)" }} />
                <Bar dataKey="value" fill="#3B6CF4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm" style={{ color: "#8896aa" }}>
              Nincs adat
            </div>
          )}
        </div>

        {/* Carrier breakdown */}
        <div className="p-5 rounded-2xl" style={cardStyle}>
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-5 text-slate-500">
           Carrier Breakdown / Fuvarozó bontás
          </h3>
          {carrierData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={carrierData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={45} strokeWidth={0}>
                    {carrierData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-3">
                {carrierData.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-1.5 text-xs" style={{ color: "#8896aa" }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    {c.name}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm" style={{ color: "#8896aa" }}>
              Nincs adat
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
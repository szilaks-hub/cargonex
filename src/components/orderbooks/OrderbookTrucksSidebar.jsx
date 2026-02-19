import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const STATUS_LABELS = {
  booked: "Előjegyzett",
  scheduled: "Ütemezett",
  loaded: "Megrakott",
  in_transit: "Úton",
  customs: "Vámon",
  transit: "TR",
  arrived: "Érkezett",
  arrived_onsite: "Telephelyi",
  arrived_offsite: "Off-site",
  closed: "Lezárt",
  cancelled: "Törölve",
};

const STATUS_COLORS = {
  booked: "bg-slate-100 text-slate-700",
  scheduled: "bg-blue-100 text-blue-800",
  loaded: "bg-amber-100 text-amber-800",
  in_transit: "bg-purple-100 text-purple-800",
  customs: "bg-orange-100 text-orange-800",
  transit: "bg-cyan-100 text-cyan-800",
  arrived: "bg-emerald-100 text-emerald-800",
  arrived_onsite: "bg-emerald-100 text-emerald-900",
  arrived_offsite: "bg-teal-100 text-teal-800",
  closed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function OrderbookTrucksSidebar({ orderId, orderNo }) {
  const [collapsed, setCollapsed] = useState(false);

  const { data: trucks = [], isLoading } = useQuery({
    queryKey: ["orderbook-trucks", orderId],
    queryFn: () => base44.entities.Truck.filter({ orderbook_id: orderId }, "-created_date"),
    enabled: !!orderId,
    refetchInterval: 10000,
  });

  const totalPlanned = trucks.reduce((s, t) => s + (t.planned_quantity_tons || 0), 0);
  const closedTons = trucks.filter(t => t.status === "closed").reduce((s, t) => s + (t.actual_weight_tons || t.planned_quantity_tons || 0), 0);
  const activeTrucks = trucks.filter(t => !["closed", "cancelled"].includes(t.status));

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 cursor-pointer"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-800 text-sm">Fuvarok / Trucks</span>
          <Badge className="bg-slate-200 text-slate-700 text-xs">{trucks.length}</Badge>
        </div>
        <div className="flex items-center gap-3">
          {trucks.length > 0 && (
            <span className="text-xs text-slate-500">
              {totalPlanned.toFixed(2)}t · <span className="text-emerald-700 font-semibold">{closedTons.toFixed(2)}t lezárt</span>
            </span>
          )}
          {collapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-3">
          {/* Truck List */}
          {isLoading ? (
            <div className="text-xs text-slate-400 py-2">Betöltés...</div>
          ) : trucks.length === 0 ? (
            <div className="text-xs text-slate-400 py-3 text-center">
              Még nincs fuvar ehhez a rendeléshez.
            </div>
          ) : (
            <div className="space-y-1.5">
              {trucks.map(truck => (
                <div
                  key={truck.id}
                  className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded border border-slate-200"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Truck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">
                        {truck.truck_number || <span className="italic text-slate-400 text-xs">Rendszám nélkül</span>}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {truck.expected_loading_date || truck.loading_date}
                        {truck.destination_city ? ` · ${truck.destination_city}` : ""}
                        {truck.carrier_name ? ` · ${truck.carrier_name}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-xs text-slate-600 font-semibold">
                      {(truck.planned_quantity_tons || 0).toFixed(2)}t
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[truck.status] || "bg-slate-100 text-slate-600"}`}>
                      {STATUS_LABELS[truck.status] || truck.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Link to Logistics */}
          <Link to={createPageUrl("Logistics")}>
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-2 border-dashed border-blue-300 text-blue-700 hover:bg-blue-50 mt-1"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Ugrás a Logisztikára → Fuvar hozzáadása
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
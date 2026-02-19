import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, Plus, ChevronDown, ChevronUp } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import TruckForm from "@/components/logistics/TruckForm";

const STATUS_COLORS = {
  scheduled: "bg-blue-100 text-blue-800",
  loaded: "bg-amber-100 text-amber-800",
  in_transit: "bg-purple-100 text-purple-800",
  customs: "bg-orange-100 text-orange-800",
  closed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function OrderbookTrucksSidebar({ orderId, orderNo, isEditable }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editTruck, setEditTruck] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const { data: trucks = [], isLoading } = useQuery({
    queryKey: ["orderbook-trucks", orderId],
    queryFn: () => base44.entities.Truck.filter({ orderbook_id: orderId }, "-created_date"),
    enabled: !!orderId,
  });

  const totalPlanned = trucks.reduce((s, t) => s + (t.planned_quantity_tons || 0), 0);
  const totalActual = trucks.reduce((s, t) => s + (t.actual_weight_tons || 0), 0);
  const closedTrucks = trucks.filter(t => t.status === "closed");
  const closedTons = closedTrucks.reduce((s, t) => s + (t.actual_weight_tons || t.planned_quantity_tons || 0), 0);

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
              {totalPlanned.toFixed(2)}t tervezett · <span className="text-emerald-700 font-semibold">{closedTons.toFixed(2)}t lezárt</span>
            </span>
          )}
          {collapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-3">
          {/* New Truck Form */}
          {showForm && (
            <TruckForm
              item={editTruck}
              defaultOrderbookId={orderId}
              defaultOrderNo={orderNo}
              onClose={() => { setShowForm(false); setEditTruck(null); }}
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ["orderbook-trucks", orderId] });
                qc.invalidateQueries({ queryKey: ["orderbook-lines", orderId] });
                qc.invalidateQueries({ queryKey: ["trucks"] });
                setShowForm(false);
                setEditTruck(null);
              }}
            />
          )}

          {/* Truck List */}
          {isLoading ? (
            <div className="text-xs text-slate-400 py-2">Betöltés...</div>
          ) : trucks.length === 0 ? (
            <div className="text-xs text-slate-400 py-2 text-center">Még nincs fuvar ehhez a rendeléshez.</div>
          ) : (
            <div className="space-y-2">
              {trucks.map(truck => (
                <div
                  key={truck.id}
                  className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded border border-slate-200 cursor-pointer hover:bg-slate-100"
                  onClick={() => { setEditTruck(truck); setShowForm(true); }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Truck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">
                        {truck.truck_number || `T-${truck.id?.slice(0, 6)}`}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {truck.expected_loading_date || truck.loading_date} · {truck.destination_city || truck.destination_country || "-"}
                        {truck.product_name && <span> · {truck.product_name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-xs text-slate-600 font-semibold">
                      {truck.status === "closed" ? (truck.actual_weight_tons || truck.planned_quantity_tons || 0).toFixed(2) : (truck.planned_quantity_tons || 0).toFixed(2)}t
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[truck.status] || "bg-slate-100 text-slate-600"}`}>
                      {truck.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isEditable && !showForm && (
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-2 border-dashed border-blue-300 text-blue-700 hover:bg-blue-50"
              onClick={() => { setEditTruck(null); setShowForm(true); }}
            >
              <Plus className="w-3.5 h-3.5" /> Új fuvar hozzáadása
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
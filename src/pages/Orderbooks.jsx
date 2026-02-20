import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Eye, Trash2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import OrderbookDetail from "@/components/orderbooks/OrderbookDetail";
import OrderbooksMasterSummary from "@/components/orderbooks/OrderbooksMasterSummary";
import OrderbookFamilyTree from "@/components/orderbooks/OrderbookFamilyTree";
import PageHeader from "@/components/ui/PageHeader";

export default function OrderbooksPage() {
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [activeTab, setActiveTab] = useState("open");
  const qc = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orderbooks'],
    queryFn: () => base44.entities.Orderbook.list(),
  });

  const { data: lines = [] } = useQuery({
    queryKey: ['orderbook-lines'],
    queryFn: () => base44.entities.OrderbookLine.list(),
  });

  const openOrders = orders.filter(o => o.status === 'open').sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
  const closedOrders = orders.filter(o => o.status === 'closed').sort((a, b) => new Date(b.closed_at) - new Date(a.closed_at));

  const getOrderMetrics = (orderId) => {
    const orderLines = lines.filter(l => l.orderbook_id === orderId);
    return {
      plannedTons: orderLines.reduce((s, l) => s + (l.planned_quantity_tons || 0), 0),
      allocatedTons: orderLines.reduce((s, l) => s + (l.allocated_quantity_tons || 0), 0),
      valueEUR: orderLines.reduce((s, l) => s + (l.line_value_eur || 0), 0),
      customsRequired: 0
    };
  };

  const handleCreateOrder = async () => {
    try {
      const result = await base44.entities.Orderbook.create({
        order_no: `ORD-${Date.now()}`,
        supplier_id: "",
        supplier_site_id: "",
        order_date: new Date().toISOString().split('T')[0],
        currency: "EUR",
        incoterms_type: "FCA",
        customs_required: false,
        status: "draft"
      });
      setSelectedOrderId(result.id);
      qc.invalidateQueries({ queryKey: ['orderbooks'] });
      toast.success('Draft order created');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const openMetrics = {
    count: openOrders.length,
    tons: openOrders.reduce((s, o) => s + getOrderMetrics(o.id).plannedTons, 0),
    value: openOrders.reduce((s, o) => s + getOrderMetrics(o.id).valueEUR, 0),
    customsCount: openOrders.filter(o => o.customs_required).length,
    suppliers: new Set(openOrders.map(o => o.supplier_id)).size
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orderbooks / Rendelések"
        subtitle="Fast order capture for logistics planning"
        onAdd={handleCreateOrder}
        addLabel="New Order"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="open">Open ({openOrders.length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({closedOrders.length})</TabsTrigger>
          <TabsTrigger value="summary">📊 Összesítő</TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4 space-y-4">
          {openOrders.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card className="p-3 bg-blue-50">
                <div className="text-xs text-slate-600">Open Orders</div>
                <div className="text-2xl font-bold text-blue-700">{openMetrics.count}</div>
              </Card>
              <Card className="p-3 bg-slate-50">
                <div className="text-xs text-slate-600">Planned (t)</div>
                <div className="text-2xl font-bold text-slate-800">{openMetrics.tons.toFixed(0)}</div>
              </Card>
              <Card className="p-3 bg-slate-50">
                <div className="text-xs text-slate-600">Total Value (EUR)</div>
                <div className="text-2xl font-bold text-slate-800">
                  {openMetrics.value.toLocaleString("hu-HU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </Card>
              <Card className="p-3 bg-orange-50">
                <div className="text-xs text-slate-600">Customs Required</div>
                <div className="text-2xl font-bold text-orange-700">{openMetrics.customsCount}</div>
              </Card>
              <Card className="p-3 bg-slate-50">
                <div className="text-xs text-slate-600">Suppliers</div>
                <div className="text-2xl font-bold text-slate-800">{openMetrics.suppliers}</div>
              </Card>
            </div>
          )}
          <OrderbooksList orders={openOrders} lines={lines} onSelect={setSelectedOrderId} onDelete={() => qc.invalidateQueries({ queryKey: ['orderbooks'] })} />
        </TabsContent>

        <TabsContent value="closed" className="mt-4">
          <OrderbooksList orders={closedOrders} lines={lines} onSelect={setSelectedOrderId} isClosed />
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          <OrderbooksMasterSummary orders={orders} lines={lines} />
        </TabsContent>
      </Tabs>

      {selectedOrderId && (
        <OrderbookDetail
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onUpdated={() => qc.invalidateQueries({ queryKey: ['orderbooks'] })}
        />
      )}
    </div>
  );
}

function OrderbooksList({ orders, lines, onSelect, onDelete, isClosed }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!orders || orders.length === 0) {
    return <div className="text-center py-8 text-slate-500">No orders</div>;
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr className="text-left text-xs font-semibold text-slate-600">
              <th className="py-3 px-4">Bész. rendelésszám</th>
              <th className="py-3 px-4">Belső szám</th>
              <th className="py-3 px-4">Beszállító</th>
              <th className="py-3 px-4">Dátum</th>
              <th className="py-3 px-4">Incoterms</th>
              <th className="py-3 px-4 text-right">Tervezett (t)</th>
              <th className="py-3 px-4 text-right">Érték (k EUR)</th>
              <th className="py-3 px-4 text-center">Vám</th>
              <th className="py-3 px-4 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => {
              const orderLines = lines.filter(l => l.orderbook_id === order.id);
              const plannedTons = orderLines.reduce((s, l) => s + (l.planned_quantity_tons || 0), 0);
              const allocatedTons = orderLines.reduce((s, l) => s + (l.allocated_quantity_tons || 0), 0);
              const valueEUR = orderLines.reduce((s, l) => s + (l.line_value_eur || 0), 0);
              const isExpanded = expandedId === order.id;
              const remainingTons = plannedTons - allocatedTons;
              const allocPct = plannedTons > 0 ? Math.round((allocatedTons / plannedTons) * 100) : 0;
              
              return (
                <React.Fragment key={order.id}>
                  <tr className={`border-b hover:bg-slate-50 ${isExpanded ? 'bg-blue-50/40' : ''}`}>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {order.supplier_order_no || <span className="text-slate-400 font-normal italic">—</span>}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">{order.order_no}</td>
                    <td className="py-3 px-4 text-slate-700">
                      <div className="font-medium">{order.supplier_name}</div>
                      <div className="text-xs text-slate-500">{order.supplier_site_name}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{order.order_date}</td>
                    <td className="py-3 px-4 text-slate-600">{order.incoterms_type}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-semibold text-slate-800">{plannedTons.toFixed(2)}</div>
                      {plannedTons > 0 && (
                        <div className="text-xs text-slate-400">{allocPct}% allokált</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-800">{(valueEUR / 1000).toFixed(1)}</td>
                    <td className="py-3 px-4 text-center">
                      {order.customs_required && (
                        <Badge className="bg-orange-100 text-orange-800 text-xs">Igen</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right flex items-center justify-end gap-1">
                      {orderLines.length > 0 && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : order.id)}
                          className="text-slate-400 hover:text-slate-700 p-1 rounded"
                          title="Termékkörök mutatása"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                      <Button size="sm" variant="ghost" className="text-blue-600" onClick={() => onSelect(order.id)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b bg-slate-50/70">
                      <td colSpan="9" className="px-6 py-3">
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Termékkörök összesítése</div>
                          {orderLines.map(line => {
                            const pct = line.planned_quantity_tons > 0
                              ? Math.round(((line.allocated_quantity_tons || 0) / line.planned_quantity_tons) * 100)
                              : 0;
                            const remaining = (line.planned_quantity_tons || 0) - (line.allocated_quantity_tons || 0);
                            return (
                              <div key={line.id} className="flex items-center gap-3">
                                <div className="w-36 text-sm font-medium text-slate-700 truncate">{line.category_name || '—'}</div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <div className="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-400'}`}
                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                      />
                                    </div>
                                    <span className={`text-xs font-bold w-10 text-right ${pct >= 100 ? 'text-emerald-600' : pct >= 50 ? 'text-blue-600' : 'text-amber-600'}`}>{pct}%</span>
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    <span className="font-medium text-blue-700">{(line.allocated_quantity_tons || 0).toFixed(2)} t</span>
                                    {' / '}
                                    <span>{line.planned_quantity_tons?.toFixed(2)} t tervezett</span>
                                    {remaining > 0.01 && <span className="ml-2 text-amber-600">· {remaining.toFixed(2)} t szabad</span>}
                                    {remaining <= 0 && remaining > -0.01 && <span className="ml-2 text-emerald-600">· Teljes</span>}
                                  </div>
                                </div>
                                <div className="text-right text-xs text-slate-500 w-24">
                                  {(line.unit_price_eur_per_ton || 0).toFixed(2)} EUR/t
                                </div>
                              </div>
                            );
                          })}
                          {/* Total row */}
                          <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                            <div className="w-36 text-xs font-bold text-slate-600 uppercase">Összesen</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <div className="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${allocPct >= 100 ? 'bg-emerald-500' : allocPct >= 50 ? 'bg-blue-500' : 'bg-amber-400'}`}
                                    style={{ width: `${Math.min(allocPct, 100)}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-bold w-10 text-right ${allocPct >= 100 ? 'text-emerald-600' : allocPct >= 50 ? 'text-blue-600' : 'text-amber-600'}`}>{allocPct}%</span>
                              </div>
                              <div className="text-xs text-slate-600 font-semibold">
                                {allocatedTons.toFixed(2)} t / {plannedTons.toFixed(2)} t · marad: {remainingTons.toFixed(2)} t
                              </div>
                            </div>
                            <div className="text-right text-xs font-semibold text-slate-700 w-24">
                              {(valueEUR / 1000).toFixed(1)} k EUR
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
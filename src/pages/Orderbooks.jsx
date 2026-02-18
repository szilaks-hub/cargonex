import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import OrderbookDetail from "@/components/orderbooks/OrderbookDetail";
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
                <div className="text-xs text-slate-600">Total Value (k EUR)</div>
                <div className="text-2xl font-bold text-slate-800">{(openMetrics.value / 1000).toFixed(1)}</div>
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
  if (!orders || orders.length === 0) {
    return <div className="text-center py-8 text-slate-500">No orders</div>;
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr className="text-left text-xs font-semibold text-slate-600">
              <th className="py-3 px-4">Order No</th>
              <th className="py-3 px-4">Supplier</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Incoterms</th>
              <th className="py-3 px-4 text-right">Planned (t)</th>
              <th className="py-3 px-4 text-right">Value (k EUR)</th>
              <th className="py-3 px-4 text-center">Customs</th>
              <th className="py-3 px-4 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => {
              const orderLines = lines.filter(l => l.orderbook_id === order.id);
              const plannedTons = orderLines.reduce((s, l) => s + (l.planned_quantity_tons || 0), 0);
              const valueEUR = orderLines.reduce((s, l) => s + (l.line_value_eur || 0), 0);
              
              return (
                <tr key={order.id} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-800">{order.order_no}</td>
                  <td className="py-3 px-4 text-slate-700">
                    <div className="font-medium">{order.supplier_name}</div>
                    <div className="text-xs text-slate-500">{order.supplier_site_name}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{order.order_date}</td>
                  <td className="py-3 px-4 text-slate-600">{order.incoterms_type}</td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-800">{plannedTons.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-slate-800">{(valueEUR / 1000).toFixed(1)}</td>
                  <td className="py-3 px-4 text-center">
                    {order.customs_required && (
                      <Badge className="bg-orange-100 text-orange-800 text-xs">Yes</Badge>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button size="sm" variant="ghost" className="text-blue-600" onClick={() => onSelect(order.id)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
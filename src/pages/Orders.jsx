import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Eye } from "lucide-react";
import { toast } from "sonner";
import OrderDetailModal from "@/components/orders/OrderDetailModal";
import PageHeader from "@/components/ui/PageHeader";

export default function OrdersPage() {
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [activeTab, setActiveTab] = useState("open");
  const qc = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.PurchaseOrder.list(),
  });

  const { data: lines = [] } = useQuery({
    queryKey: ['orderLines'],
    queryFn: () => base44.entities.PurchaseOrderLine.list(),
  });

  const getOrderMetrics = (orderId) => {
    const orderLines = lines.filter(l => l.purchase_order_id === orderId);
    const allocated = orderLines.reduce((sum, l) => sum + (l.allocated_quantity_tons || 0), 0);
    const planned = orderLines.reduce((sum, l) => sum + (l.planned_quantity_tons || 0), 0);
    return { allocated, planned, lineCount: orderLines.length };
  };

  const handleCreateOrder = async () => {
    try {
      const result = await base44.entities.PurchaseOrder.create({
        supplier_id: "",
        supplier_site_id: "",
        order_date: new Date().toISOString().split('T')[0],
        currency: "EUR",
        incoterms_type: "FCA",
        status: "draft"
      });
      setSelectedOrderId(result.id);
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Draft order created');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const filterByStatus = (status) => {
    return orders.filter(o => o.status === status).sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
  };

  const renderOrderRow = (order) => {
    const metrics = getOrderMetrics(order.id);
    return (
      <tr key={order.id} className="border-b hover:bg-slate-50 transition-colors">
        <td className="py-3 px-4">
          <div className="font-semibold text-slate-800">{order.order_number || 'Draft'}</div>
          <div className="text-xs text-slate-500">{order.supplier_name}</div>
        </td>
        <td className="py-3 px-4 text-sm text-slate-600">{order.supplier_site_name}</td>
        <td className="py-3 px-4 text-sm text-slate-600">{order.order_date}</td>
        <td className="py-3 px-4 text-sm text-slate-600">{order.incoterms_type}</td>
        <td className="py-3 px-4 text-sm text-center font-semibold text-slate-800">{metrics.lineCount}</td>
        <td className="py-3 px-4 text-sm text-right">
          <span className="font-semibold text-blue-700">{metrics.allocated.toFixed(2)} t</span>
          {metrics.planned > 0 && <span className="text-slate-500"> / {metrics.planned.toFixed(2)} t</span>}
        </td>
        <td className="py-3 px-4 text-right">
          <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50" onClick={() => setSelectedOrderId(order.id)}>
            <Eye className="w-4 h-4" />
          </Button>
        </td>
      </tr>
    );
  };

  const openOrders = filterByStatus('open');
  const closedOrders = filterByStatus('closed');
  const archivedOrders = filterByStatus('archived');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        subtitle="Manage orders by category"
        onAdd={handleCreateOrder}
        addLabel="New Order"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="open" className="text-sm">
            Open ({openOrders.length})
          </TabsTrigger>
          <TabsTrigger value="closed" className="text-sm">
            Closed ({closedOrders.length})
          </TabsTrigger>
          <TabsTrigger value="archived" className="text-sm">
            Archived ({archivedOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4">
          <OrdersTable orders={openOrders} isLoading={isLoading} onRowClick={(order) => setSelectedOrderId(order.id)} renderRow={renderOrderRow} />
        </TabsContent>

        <TabsContent value="closed" className="mt-4">
          <OrdersTable orders={closedOrders} isLoading={isLoading} onRowClick={(order) => setSelectedOrderId(order.id)} renderRow={renderOrderRow} />
        </TabsContent>

        <TabsContent value="archived" className="mt-4">
          <OrdersTable orders={archivedOrders} isLoading={isLoading} onRowClick={(order) => setSelectedOrderId(order.id)} renderRow={renderOrderRow} />
        </TabsContent>
      </Tabs>

      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onOrderUpdated={() => qc.invalidateQueries({ queryKey: ['orders'] })}
        />
      )}
    </div>
  );
}

function OrdersTable({ orders, isLoading, renderRow }) {
  if (isLoading) return <div className="text-center py-8 text-slate-500">Loading...</div>;
  if (orders.length === 0) return <div className="text-center py-8 text-slate-500">No orders</div>;

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr className="text-left text-xs font-semibold text-slate-600">
              <th className="py-3 px-4">Order</th>
              <th className="py-3 px-4">Site</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Incoterms</th>
              <th className="py-3 px-4 text-center">Categories</th>
              <th className="py-3 px-4 text-right">Allocated</th>
              <th className="py-3 px-4 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map(renderRow)}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
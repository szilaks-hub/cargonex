import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Eye, Trash2 } from "lucide-react";
import OrderDetail from "../components/orders/OrderDetail";

const statusStyles = {
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  open: "bg-blue-50 text-blue-700 border-blue-200",
  closed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-slate-50 text-slate-500 border-slate-200"
};

export default function Orders() {
  const [activeTab, setActiveTab] = useState("open");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const queryClient = useQueryClient();

  // Fetch all orders
  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-order_date', 200),
  });

  // Fetch all lines for received qty aggregation
  const { data: allLines = [] } = useQuery({
    queryKey: ['allLines'],
    queryFn: () => base44.entities.PurchaseOrderLine.list(),
  });

  // Group orders by status
  const openOrders = orders.filter(o => ['draft', 'open'].includes(o.status));
  const closedOrders = orders.filter(o => o.status === 'closed');
  const archivedOrders = orders.filter(o => o.status === 'archived');

  // Calculate order metrics
  const getOrderMetrics = (orderId) => {
    const lines = allLines.filter(l => l.purchase_order_id === orderId);
    const totalOrdered = lines.reduce((sum, l) => sum + (l.ordered_quantity_tons || 0), 0);
    const totalReceived = lines.reduce((sum, l) => sum + (l.received_quantity_tons || 0), 0);
    return {
      totalOrdered,
      totalReceived,
      remaining: totalOrdered - totalReceived
    };
  };

  // Summary calculations for Open orders
  const openMetrics = openOrders.reduce((acc, order) => {
    const metrics = getOrderMetrics(order.id);
    return {
      count: acc.count + 1,
      totalOrdered: acc.totalOrdered + metrics.totalOrdered,
      totalReceived: acc.totalReceived + metrics.totalReceived,
      suppliers: new Set([...acc.suppliers, order.supplier_name])
    };
  }, { count: 0, totalOrdered: 0, totalReceived: 0, suppliers: new Set() });

  const handleCreateOrder = async () => {
    const order = await base44.entities.PurchaseOrder.create({
      supplier_id: "",
      supplier_site_id: "",
      order_date: new Date().toISOString().split('T')[0],
      currency: "EUR",
      incoterms_type: "FCA",
      status: "draft"
    });
    setSelectedOrderId(order.id);
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const handleDeleteOrder = async (orderId) => {
    if (confirm('Delete this order?')) {
      try {
        // Delete associated lines first
        const lines = allLines.filter(l => l.purchase_order_id === orderId);
        for (const line of lines) {
          await base44.entities.PurchaseOrderLine.delete(line.id);
        }
        // Delete order
        await base44.entities.PurchaseOrder.delete(orderId);
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['allLines'] });
      } catch (error) {
        alert('Cannot delete: ' + error.message);
      }
    }
  };

  const OrderRow = ({ order }) => {
    const metrics = getOrderMetrics(order.id);
    return (
      <tr className="border-t hover:bg-slate-50 transition">
        <td className="px-4 py-3">
          <div className="font-medium text-slate-800">{order.supplier_name}</div>
          <div className="text-xs text-slate-500">{order.supplier_site_name}</div>
        </td>
        <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-800">{order.order_number || 'N/A'}</td>
        <td className="px-4 py-3 text-sm text-slate-700">{order.order_date}</td>
        <td className="px-4 py-3 text-sm text-slate-700">
          {order.incoterms_type} {order.incoterms_place && `@ ${order.incoterms_place}`}
        </td>
        <td className="px-4 py-3 text-sm font-semibold text-slate-800">{metrics.totalOrdered.toFixed(2)}</td>
        <td className="px-4 py-3 text-sm text-slate-700">{metrics.totalReceived.toFixed(2)}</td>
        <td className="px-4 py-3 text-sm text-slate-700">{metrics.remaining.toFixed(2)}</td>
        <td className="px-4 py-3">
          <Badge className={`${statusStyles[order.status]} border text-xs`}>
            {order.status.toUpperCase()}
          </Badge>
        </td>
        <td className="px-4 py-3 text-right space-x-1">
          <button
            onClick={() => setSelectedOrderId(order.id)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            <Eye className="w-3 h-3" /> View
          </button>
          {order.status === 'draft' && (
            <button
              onClick={() => handleDeleteOrder(order.id)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-xs text-blue-600 font-semibold">OPEN ORDERS</div>
          <div className="text-3xl font-bold text-blue-800 mt-1">{openMetrics.count}</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100">
          <div className="text-xs text-indigo-600 font-semibold">ORDERED (t)</div>
          <div className="text-3xl font-bold text-indigo-800 mt-1">{openMetrics.totalOrdered.toFixed(0)}</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100">
          <div className="text-xs text-emerald-600 font-semibold">RECEIVED (t)</div>
          <div className="text-3xl font-bold text-emerald-800 mt-1">{openMetrics.totalReceived.toFixed(0)}</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="text-xs text-orange-600 font-semibold">REMAINING (t)</div>
          <div className="text-3xl font-bold text-orange-800 mt-1">{(openMetrics.totalOrdered - openMetrics.totalReceived).toFixed(0)}</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="text-xs text-slate-600 font-semibold">SUPPLIERS</div>
          <div className="text-3xl font-bold text-slate-800 mt-1">{openMetrics.suppliers.size}</div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="open">Open / Nyitott</TabsTrigger>
            <TabsTrigger value="closed">Closed / Lezárt</TabsTrigger>
            <TabsTrigger value="archived">Archived / Archivált</TabsTrigger>
          </TabsList>
          <Button onClick={handleCreateOrder} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Order
          </Button>
        </div>

        <TabsContent value="open" className="space-y-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Supplier + Site</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Order #</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Incoterms</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Ordered</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Received</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Remaining</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {openOrders.length > 0 ? (
                    openOrders.map(order => <OrderRow key={order.id} order={order} />)
                  ) : (
                    <tr>
                      <td colSpan="9" className="px-4 py-8 text-center text-slate-500">No open orders</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="closed" className="space-y-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Supplier + Site</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Order #</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Incoterms</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Ordered</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Received</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Remaining</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {closedOrders.length > 0 ? (
                    closedOrders.map(order => <OrderRow key={order.id} order={order} />)
                  ) : (
                    <tr>
                      <td colSpan="9" className="px-4 py-8 text-center text-slate-500">No closed orders</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="archived" className="space-y-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Supplier + Site</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Order #</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Incoterms</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Ordered</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Received</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Remaining</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedOrders.length > 0 ? (
                    archivedOrders.map(order => <OrderRow key={order.id} order={order} />)
                  ) : (
                    <tr>
                      <td colSpan="9" className="px-4 py-8 text-center text-slate-500">No archived orders</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order Detail Modal */}
      {selectedOrderId && (
        <OrderDetail
          orderId={selectedOrderId}
          onClose={() => {
            setSelectedOrderId(null);
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['allLines'] });
          }}
        />
      )}
    </div>
  );
}
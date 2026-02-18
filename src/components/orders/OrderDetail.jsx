import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Trash2 } from "lucide-react";
import OrderForm from "./OrderForm";
import OrderLineForm from "./OrderLineForm";
import OrderSummary from "./OrderSummary";

const statusStyles = {
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  open: "bg-blue-50 text-blue-700 border-blue-200",
  closed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-slate-50 text-slate-500 border-slate-200"
};

export default function OrderDetail({ orderId, onClose }) {
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => base44.entities.PurchaseOrder.filter({ id: orderId }).then(r => r?.[0]),
    enabled: !!orderId
  });

  const { data: lines = [] } = useQuery({
    queryKey: ['orderLines', orderId],
    queryFn: () => base44.entities.PurchaseOrderLine.filter({ purchase_order_id: orderId }),
    enabled: !!orderId
  });

  if (orderLoading) {
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card className="p-6 text-center">
          <p className="text-slate-600">Order not found</p>
          <Button onClick={onClose} className="mt-4">Close</Button>
        </Card>
      </div>
    );
  }

  const isDraft = order?.status === 'draft';

  const handleStatusChange = async (newStatus) => {
    try {
      const updateData = {
        status: newStatus,
      };
      if (newStatus === 'closed') {
        updateData.closed_at = new Date().toISOString();
        const user = await base44.auth.me();
        updateData.closed_by = user?.email;
      }
      if (newStatus === 'archived') {
        updateData.archived_at = new Date().toISOString();
        const user = await base44.auth.me();
        updateData.archived_by = user?.email;
      }
      await base44.entities.PurchaseOrder.update(orderId, updateData);
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this order and all lines?')) return;
    try {
      // Delete lines first
      for (const line of lines) {
        await base44.entities.PurchaseOrderLine.delete(line.id);
      }
      // Delete order
      await base44.entities.PurchaseOrder.delete(orderId);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onClose?.();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleDeleteLine = async (lineId) => {
    if (!confirm('Delete this line?')) return;
    try {
      await base44.entities.PurchaseOrderLine.delete(lineId);
      queryClient.invalidateQueries({ queryKey: ['orderLines', orderId] });
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-50 to-white border-b p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{order.order_number || 'Draft'}</h2>
            <p className="text-sm text-slate-500">{order.supplier_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status and Actions */}
          <div className="flex items-center justify-between">
            <Badge className={`${statusStyles[order.status]} border`}>
              {order.status?.toUpperCase()}
            </Badge>
            <div className="flex gap-2">
              {isDraft && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange('open')}
                  >
                    Open Order
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    onClick={handleDelete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
              {order.status === 'open' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange('closed')}>
                    Close Order
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange('archived')}>
                    Archive
                  </Button>
                </>
              )}
              {order.status === 'closed' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange('open')}>
                    Reopen
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange('archived')}>
                    Archive
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Form or Display */}
          {isEditing || isDraft ? (
            <OrderForm
              orderId={orderId}
              isDraft={isDraft}
              onSaved={() => {
                setIsEditing(false);
                queryClient.invalidateQueries({ queryKey: ['order', orderId] });
              }}
            />
          ) : (
            <Card className="p-4 bg-slate-50">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-slate-500">Supplier</div>
                  <div className="font-medium text-slate-800">{order.supplier_name}</div>
                </div>
                <div>
                  <div className="text-slate-500">Site</div>
                  <div className="font-medium text-slate-800">{order.supplier_site_name}</div>
                </div>
                <div>
                  <div className="text-slate-500">Date</div>
                  <div className="font-medium text-slate-800">{order.order_date}</div>
                </div>
                <div>
                  <div className="text-slate-500">Currency</div>
                  <div className="font-medium text-slate-800">{order.currency}</div>
                </div>
                <div>
                  <div className="text-slate-500">Incoterms</div>
                  <div className="font-medium text-slate-800">{order.incoterms_type} {order.incoterms_place}</div>
                </div>
                {order.payment_terms && (
                  <div>
                    <div className="text-slate-500">Payment Terms</div>
                    <div className="font-medium text-slate-800">{order.payment_terms}</div>
                  </div>
                )}
              </div>
              {order.notes && (
                <div className="mt-4 pt-4 border-t text-sm">
                  <div className="text-slate-500 mb-1">Notes</div>
                  <div className="text-slate-700">{order.notes}</div>
                </div>
              )}
            </Card>
          )}

          {/* Lines */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800">Order Lines</h3>
            {lines.length > 0 ? (
              <div className="space-y-2">
                {lines.map(line => (
                  <Card key={line.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs">{line.product_category_name}</Badge>
                          {line.diameter && <Badge variant="outline" className="text-xs">{line.diameter}mm</Badge>}
                        </div>
                        {line.specification && (
                          <div className="text-sm text-slate-600">{line.specification}</div>
                        )}
                        <div className="text-sm font-semibold text-slate-800">
                          {line.ordered_quantity_tons} t @ {line.unit_price_per_ton} EUR/t = {(line.ordered_quantity_tons * line.unit_price_per_ton).toFixed(0)} EUR
                        </div>
                        {line.target_delivery_period && (
                          <div className="text-xs text-slate-500">Target: {line.target_delivery_period}</div>
                        )}
                      </div>
                      {isDraft && (
                        <button
                          onClick={() => handleDeleteLine(line.id)}
                          className="text-slate-400 hover:text-red-600 ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No lines added yet</p>
            )}
            {isDraft && <OrderLineForm orderId={orderId} onLineAdded={() => queryClient.invalidateQueries({ queryKey: ['orderLines', orderId] })} isDraft={isDraft} />}
          </div>

          {/* Summary */}
          {lines.length > 0 && <OrderSummary lines={lines} />}
        </div>
      </Card>
    </div>
  );
}
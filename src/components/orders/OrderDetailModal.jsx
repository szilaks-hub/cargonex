import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, Plus, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const INCOTERMS = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'];

export default function OrderDetailModal({ orderId, onClose, onOrderUpdated }) {
  const [isDrafting, setIsDrafting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const qc = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => base44.entities.PurchaseOrder.filter({ id: orderId }).then(r => r?.[0]),
    enabled: !!orderId
  });

  const { data: lines = [] } = useQuery({
    queryKey: ['orderLines', orderId],
    queryFn: () => base44.entities.PurchaseOrderLine.filter({ purchase_order_id: orderId }),
    enabled: !!orderId
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.ProductCategory.list(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Partner.filter({ roles: 'supplier' }),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites', order?.supplier_id],
    queryFn: () => order?.supplier_id ? base44.entities.PartnerLocation.filter({ partner_id: order.supplier_id }) : [],
    enabled: !!order?.supplier_id
  });

  if (isLoading) return null;
  if (!order) return null;

  const isDraft = order.status === 'draft';
  const isClosed = order.status === 'closed';
  const isOpen = order.status === 'open';

  const handleStatusChange = async (newStatus, reason) => {
    setConfirmDialog(null);
    const user = await base44.auth.me();
    const updateData = { status: newStatus };

    if (newStatus === 'closed') {
      updateData.closed_at = new Date().toISOString();
      updateData.closed_by = user?.email;
    } else if (newStatus === 'open') {
      updateData.closed_at = null;
      updateData.closed_by = null;
    } else if (newStatus === 'archived') {
      updateData.archived_at = new Date().toISOString();
      updateData.archived_by = user?.email;
    }

    await base44.entities.PurchaseOrder.update(orderId, updateData);
    qc.invalidateQueries({ queryKey: ['orders', 'order', orderId] });
    toast.success(`Order ${newStatus}`);
    onOrderUpdated?.();
  };

  const handleDelete = async () => {
    setConfirmDialog(null);
    try {
      for (const line of lines) {
        await base44.entities.PurchaseOrderLine.delete(line.id);
      }
      await base44.entities.PurchaseOrder.delete(orderId);
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order deleted');
      onClose?.();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteLine = async (lineId) => {
    await base44.entities.PurchaseOrderLine.delete(lineId);
    qc.invalidateQueries({ queryKey: ['orderLines', orderId] });
    toast.success('Line deleted');
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
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
          {/* Status & Actions */}
          <div className="flex items-center justify-between">
            <Badge className={`text-xs font-semibold px-3 py-1 ${
              order.status === 'draft' ? 'bg-amber-100 text-amber-800' :
              order.status === 'open' ? 'bg-blue-100 text-blue-800' :
              order.status === 'closed' ? 'bg-emerald-100 text-emerald-800' :
              'bg-slate-100 text-slate-800'
            }`}>
              {order.status?.toUpperCase()}
            </Badge>
            <div className="flex gap-2 flex-wrap justify-end">
              {isDraft && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setConfirmDialog({ action: 'open', title: 'Open Order?', desc: 'This will move the order to Open status and allow logistics assignments.' })}>
                    Confirm Open
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirmDialog({ action: 'delete', title: 'Delete Order?', desc: 'This cannot be undone.' })}>
                    Delete
                  </Button>
                </>
              )}
              {isOpen && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setConfirmDialog({ action: 'close', title: 'Close Order?', desc: 'Mark this order as Closed. You can reopen it if needed.' })}>
                    Close Order
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmDialog({ action: 'archive', title: 'Archive Order?', desc: 'The order will move to archive. Close it first if open.' })}>
                    Archive
                  </Button>
                </>
              )}
              {isClosed && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setConfirmDialog({ action: 'reopen', title: 'Reopen Order?', desc: 'Move order back to Open status for new allocations.' })}>
                    Reopen
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmDialog({ action: 'archive', title: 'Archive Order?', desc: 'The order will move to archive.' })}>
                    Archive
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Order Details */}
          {!isDrafting ? (
            <Card className="p-4 bg-slate-50">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-slate-500 text-xs font-medium">Supplier</div>
                  <div className="font-semibold text-slate-800">{order.supplier_name}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs font-medium">Site</div>
                  <div className="font-semibold text-slate-800">{order.supplier_site_name}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs font-medium">Date</div>
                  <div className="font-semibold text-slate-800">{order.order_date}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs font-medium">Currency</div>
                  <div className="font-semibold text-slate-800">{order.currency}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs font-medium">Incoterms</div>
                  <div className="font-semibold text-slate-800">{order.incoterms_type} {order.incoterms_place}</div>
                </div>
                {order.payment_terms && (
                  <div>
                    <div className="text-slate-500 text-xs font-medium">Payment Terms</div>
                    <div className="font-semibold text-slate-800">{order.payment_terms}</div>
                  </div>
                )}
              </div>
              {order.notes && (
                <div className="mt-4 pt-4 border-t text-sm">
                  <div className="text-slate-500 text-xs font-medium mb-1">Notes</div>
                  <div className="text-slate-700">{order.notes}</div>
                </div>
              )}
              {isDraft && (
                <Button size="sm" variant="ghost" className="mt-4 text-blue-600" onClick={() => setIsDrafting(true)}>
                  Edit
                </Button>
              )}
            </Card>
          ) : (
            <OrderFormInline orderId={orderId} suppliers={suppliers} sites={sites} onSaved={() => {
              setIsDrafting(false);
              qc.invalidateQueries({ queryKey: ['order', orderId] });
            }} />
          )}

          {/* Category Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Category Lines</h3>
              {isDraft && (
                <Button size="sm" variant="outline" className="gap-2" onClick={() => setConfirmDialog({ action: 'addLine' })}>
                  <Plus className="w-3 h-3" /> Add Category
                </Button>
              )}
            </div>

            {lines.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-slate-600 text-xs font-semibold">
                      <th className="text-left py-2 px-3">Category</th>
                      <th className="text-right py-2 px-3">Planned (t)</th>
                      <th className="text-right py-2 px-3">Allocated (t)</th>
                      <th className="text-right py-2 px-3">Remaining</th>
                      <th className="text-left py-2 px-3">Notes</th>
                      {isDraft && <th className="text-right py-2 px-3">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map(line => {
                      const remaining = line.planned_quantity_tons ? (line.planned_quantity_tons - (line.allocated_quantity_tons || 0)) : null;
                      return (
                        <tr key={line.id} className="border-b hover:bg-slate-50">
                          <td className="py-3 px-3 font-medium text-slate-800">{line.product_category_name}</td>
                          <td className="text-right py-3 px-3 text-slate-600">{line.planned_quantity_tons?.toFixed(2) || '-'}</td>
                          <td className="text-right py-3 px-3 text-blue-600 font-semibold">{(line.allocated_quantity_tons || 0).toFixed(2)}</td>
                          <td className="text-right py-3 px-3 text-slate-600">{remaining !== null ? remaining.toFixed(2) : '-'}</td>
                          <td className="py-3 px-3 text-slate-600 text-xs">{line.notes || '-'}</td>
                          {isDraft && (
                            <td className="text-right py-3 px-3">
                              <button onClick={() => handleDeleteLine(line.id)} className="text-red-600 hover:text-red-800">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-4">No categories added yet</p>
            )}
          </div>

          {/* Allocated Tons Summary */}
          {lines.length > 0 && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">Total Allocated</span>
                <span className="text-2xl font-bold text-blue-700">{order.allocated_quantity_tons?.toFixed(2)} t</span>
              </div>
            </Card>
          )}
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              {confirmDialog?.title}
            </DialogTitle>
            <DialogDescription>{confirmDialog?.desc}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button
              className={confirmDialog?.action === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
              onClick={() => {
                if (confirmDialog?.action === 'delete') handleDelete();
                else if (confirmDialog?.action === 'addLine') {
                  setConfirmDialog(null);
                  // Will show add line form
                }
                else handleStatusChange(confirmDialog?.action === 'reopen' ? 'open' : confirmDialog?.action);
              }}
            >
              {confirmDialog?.action === 'delete' ? 'Delete' : 'Confirm'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderFormInline({ orderId, suppliers, sites, onSaved }) {
  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => base44.entities.PurchaseOrder.filter({ id: orderId }).then(r => r?.[0]),
  });

  const [form, setForm] = useState({
    supplier_id: order?.supplier_id || "",
    supplier_site_id: order?.supplier_site_id || "",
    order_date: order?.order_date || new Date().toISOString().split('T')[0],
    currency: order?.currency || "EUR",
    incoterms_type: order?.incoterms_type || "FCA",
    incoterms_place: order?.incoterms_place || "",
    payment_terms: order?.payment_terms || "",
    notes: order?.notes || ""
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const supplier = suppliers.find(s => s.id === form.supplier_id);
    const site = sites.find(s => s.id === form.supplier_site_id);
    await base44.entities.PurchaseOrder.update(orderId, {
      ...form,
      supplier_name: supplier?.name,
      supplier_site_name: site?.location_name
    });
    setSaving(false);
    onSaved?.();
  };

  return (
    <Card className="p-4 space-y-3 bg-slate-50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Select value={form.supplier_id} onValueChange={(v) => setForm({...form, supplier_id: v})}>
          <SelectTrigger><SelectValue placeholder="Supplier" /></SelectTrigger>
          <SelectContent>{suppliers.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
        </Select>
        <Select value={form.supplier_site_id} onValueChange={(v) => setForm({...form, supplier_site_id: v})}>
          <SelectTrigger><SelectValue placeholder="Site" /></SelectTrigger>
          <SelectContent>{sites.map(s => (<SelectItem key={s.id} value={s.id}>{s.location_name}</SelectItem>))}</SelectContent>
        </Select>
        <Input type="date" value={form.order_date} onChange={(e) => setForm({...form, order_date: e.target.value})} />
        <Select value={form.currency} onValueChange={(v) => setForm({...form, currency: v})}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="EUR">EUR</SelectItem><SelectItem value="HUF">HUF</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
        </Select>
        <Select value={form.incoterms_type} onValueChange={(v) => setForm({...form, incoterms_type: v})}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{INCOTERMS.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent>
        </Select>
        <Input placeholder="Incoterms Place" value={form.incoterms_place} onChange={(e) => setForm({...form, incoterms_place: e.target.value})} />
        <Input placeholder="Payment Terms" value={form.payment_terms} onChange={(e) => setForm({...form, payment_terms: e.target.value})} className="md:col-span-2" />
        <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} className="md:col-span-2" />
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => location.reload()}>Cancel</Button>
        <Button size="sm" className="bg-blue-600" onClick={handleSave} disabled={saving}><Save className="w-3 h-3 mr-1" /> Save</Button>
      </div>
    </Card>
  );
}
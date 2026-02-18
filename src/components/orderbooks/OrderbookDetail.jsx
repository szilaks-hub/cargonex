import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { X, Save, Plus, Trash2, AlertCircle, ChevronDown, Edit2 } from "lucide-react";
import { toast } from "sonner";

const INCOTERMS = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'];

export default function OrderbookDetail({ orderId, onClose, onUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingLineId, setEditingLineId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const qc = useQueryClient();

  const { data: orderbook, isLoading } = useQuery({
    queryKey: ['orderbook', orderId],
    queryFn: () => base44.entities.Orderbook.filter({ id: orderId }).then(r => r?.[0]),
    enabled: !!orderId
  });

  const { data: lines = [] } = useQuery({
    queryKey: ['orderbook-lines', orderId],
    queryFn: () => base44.entities.OrderbookLine.filter({ orderbook_id: orderId }),
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

  const { data: customsAgents = [] } = useQuery({
    queryKey: ['customs-agents'],
    queryFn: () => base44.entities.Partner.filter({ roles: 'customs_agent' }),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites', orderbook?.supplier_id],
    queryFn: () => orderbook?.supplier_id ? base44.entities.PartnerLocation.filter({ partner_id: orderbook.supplier_id }) : [],
    enabled: !!orderbook?.supplier_id
  });

  if (isLoading || !orderbook) return null;

  const isDraft = orderbook.status === 'draft';
  const isOpen = orderbook.status === 'open';
  const isClosed = orderbook.status === 'closed';
  const canEdit = isDraft || isOpen;

  const handleStatusChange = async (newStatus) => {
    const user = await base44.auth.me();
    const updateData = { status: newStatus };
    if (newStatus === 'closed') {
      updateData.closed_at = new Date().toISOString();
      updateData.closed_by = user?.email;
    }
    await base44.entities.Orderbook.update(orderId, updateData);
    qc.invalidateQueries({ queryKey: ['orderbooks', 'orderbook', orderId] });
    toast.success(`Order ${newStatus}`);
    setConfirmDialog(null);
    onUpdated?.();
  };

  const handleDeleteOrder = async () => {
    try {
      for (const line of lines) await base44.entities.OrderbookLine.delete(line.id);
      await base44.entities.Orderbook.delete(orderId);
      qc.invalidateQueries({ queryKey: ['orderbooks'] });
      toast.success('Order deleted');
      setConfirmDialog(null);
      onClose?.();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteLine = async (lineId) => {
    await base44.entities.OrderbookLine.delete(lineId);
    qc.invalidateQueries({ queryKey: ['orderbook-lines', orderId] });
    toast.success('Line deleted');
  };

  const plannedTons = lines.reduce((s, l) => s + (l.planned_quantity_tons || 0), 0);
  const allocatedTons = lines.reduce((s, l) => s + (l.allocated_quantity_tons || 0), 0);
  const valueEUR = lines.reduce((s, l) => s + (l.line_value_eur || 0), 0);
  const customsFeeEUR = orderbook.customs_required ? (orderbook.customs_fee_eur_per_ton || 0) * plannedTons : 0;
  const otherFeesEUR = orderbook.other_fees_enabled ? (orderbook.other_fees || []).reduce((s, f) => s + (f.fee_eur_per_ton || 0) * plannedTons, 0) : 0;
  const grandTotalEUR = valueEUR + customsFeeEUR + otherFeesEUR;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-50 to-white border-b p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{orderbook.order_no || 'Draft'}</h2>
            <p className="text-sm text-slate-500">{orderbook.supplier_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & Actions */}
          <div className="flex items-center justify-between">
            <Badge className={`text-xs font-semibold px-3 py-1 ${
              isDraft ? 'bg-amber-100 text-amber-800' :
              isOpen ? 'bg-blue-100 text-blue-800' :
              'bg-emerald-100 text-emerald-800'
            }`}>
              {orderbook.status?.toUpperCase()}
            </Badge>
            <div className="flex gap-2">
              {isDraft && (
                <>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setConfirmDialog({ action: 'open', title: 'Open Order?', desc: 'Move to Open for logistics planning.' })}>
                    Open
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setConfirmDialog({ action: 'delete', title: 'Delete Order?', desc: 'This cannot be undone.' })}>
                    Delete
                  </Button>
                </>
              )}
              {isOpen && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setConfirmDialog({ action: 'close', title: 'Close Order?', desc: 'Move to Closed for reporting and statistics.' })}>
                    Close
                  </Button>
                </>
              )}
              {isClosed && (
                <Button size="sm" variant="outline" onClick={() => setConfirmDialog({ action: 'reopen', title: 'Reopen Order?', desc: 'Move back to Open.' })}>
                  Reopen
                </Button>
              )}
            </div>
          </div>

          {/* Header Card */}
          {!isEditing ? (
            <Card className="p-4 bg-slate-50">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-slate-500 text-xs font-medium">Supplier</div>
                  <div className="font-semibold text-slate-800">{orderbook.supplier_name}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs font-medium">Site</div>
                  <div className="font-semibold text-slate-800">{orderbook.supplier_site_name}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs font-medium">Date</div>
                  <div className="font-semibold text-slate-800">{orderbook.order_date}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs font-medium">Currency</div>
                  <div className="font-semibold text-slate-800">{orderbook.currency}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs font-medium">Incoterms</div>
                  <div className="font-semibold text-slate-800">{orderbook.incoterms_type} {orderbook.incoterms_place}</div>
                </div>
                {orderbook.payment_terms && (
                  <div>
                    <div className="text-slate-500 text-xs font-medium">Payment Terms</div>
                    <div className="font-semibold text-slate-800">{orderbook.payment_terms}</div>
                  </div>
                )}
              </div>
              {orderbook.notes && (
                <div className="mt-4 pt-4 border-t text-sm">
                  <div className="text-slate-500 text-xs font-medium mb-1">Notes</div>
                  <div className="text-slate-700">{orderbook.notes}</div>
                </div>
              )}
              {canEdit && (
                <Button size="sm" variant="ghost" className="mt-4 text-blue-600 gap-1" onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-3 h-3" /> Edit
                </Button>
              )}
            </Card>
          ) : (
            <HeaderEditForm orderbook={orderbook} suppliers={suppliers} sites={sites} customsAgents={customsAgents} onSaved={() => {
              setIsEditing(false);
              qc.invalidateQueries({ queryKey: ['orderbook', orderId] });
            }} onCancel={() => setIsEditing(false)} />
          )}

          {/* Category Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Category Lines ({lines.length})</h3>
              {canEdit && (
                <Button size="sm" variant="outline" className="gap-2" onClick={() => setConfirmDialog({ action: 'addLine' })}>
                  <Plus className="w-3 h-3" /> Add Line
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
                      <th className="text-right py-2 px-3">Price (EUR/t)</th>
                      <th className="text-right py-2 px-3">Value (EUR)</th>
                      <th className="text-right py-2 px-3">Allocated (t)</th>
                      <th className="text-left py-2 px-3">Notes</th>
                      {canEdit && <th className="text-right py-2 px-3 w-20">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map(line => {
                      if (editingLineId === line.id) {
                        return <LineEditRow key={line.id} line={line} categories={categories} onSave={(data) => {
                          base44.entities.OrderbookLine.update(line.id, data);
                          setEditingLineId(null);
                          qc.invalidateQueries({ queryKey: ['orderbook-lines', orderId] });
                        }} onCancel={() => setEditingLineId(null)} />;
                      }
                      return (
                        <tr key={line.id} className="border-b hover:bg-slate-50">
                          <td className="py-3 px-3 font-medium text-slate-800">{line.category_name}</td>
                          <td className="text-right py-3 px-3 text-slate-600">{line.planned_quantity_tons?.toFixed(2)}</td>
                          <td className="text-right py-3 px-3 text-slate-600">{line.unit_price_eur_per_ton?.toFixed(2)}</td>
                          <td className="text-right py-3 px-3 font-semibold text-slate-800">{(line.line_value_eur || 0).toFixed(0)}</td>
                          <td className="text-right py-3 px-3 text-blue-600 font-semibold">{(line.allocated_quantity_tons || 0).toFixed(2)}</td>
                          <td className="py-3 px-3 text-slate-600 text-xs">{line.notes || '-'}</td>
                          {canEdit && (
                            <td className="text-right py-3 px-3 space-x-1">
                              <button onClick={() => setEditingLineId(line.id)} className="text-blue-600 hover:text-blue-800 inline"><Edit2 className="w-3 h-3" /></button>
                              <button onClick={() => handleDeleteLine(line.id)} className="text-red-600 hover:text-red-800 inline"><Trash2 className="w-3 h-3" /></button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-4">No lines added yet</p>
            )}
          </div>

          {/* Summary Card */}
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-slate-50 border-blue-200">
            <h3 className="font-semibold text-slate-800 mb-3">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-slate-600">Planned</div>
                <div className="text-2xl font-bold text-slate-800">{plannedTons.toFixed(2)}</div>
                <div className="text-xs text-slate-500">tons</div>
              </div>
              <div>
                <div className="text-slate-600">Allocated</div>
                <div className="text-2xl font-bold text-blue-700">{allocatedTons.toFixed(2)}</div>
                <div className="text-xs text-slate-500">tons</div>
              </div>
              <div>
                <div className="text-slate-600">Order Value</div>
                <div className="text-2xl font-bold text-slate-800">{(valueEUR / 1000).toFixed(1)}</div>
                <div className="text-xs text-slate-500">k EUR</div>
              </div>
              <div>
                <div className="text-slate-600">Grand Total</div>
                <div className="text-2xl font-bold text-blue-700">{(grandTotalEUR / 1000).toFixed(1)}</div>
                <div className="text-xs text-slate-500">k EUR</div>
              </div>
            </div>
            {(customsFeeEUR > 0 || otherFeesEUR > 0) && (
              <div className="mt-4 pt-4 border-t text-sm space-y-1">
                {customsFeeEUR > 0 && <div className="flex justify-between"><span className="text-slate-600">Customs Fee:</span><span className="font-semibold">{customsFeeEUR.toFixed(0)} EUR</span></div>}
                {otherFeesEUR > 0 && <div className="flex justify-between"><span className="text-slate-600">Other Fees:</span><span className="font-semibold">{otherFeesEUR.toFixed(0)} EUR</span></div>}
              </div>
            )}
          </Card>
        </div>
      </Card>

      {/* Dialogs */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              {confirmDialog?.title}
            </DialogTitle>
            <DialogDescription>{confirmDialog?.desc}</DialogDescription>
          </DialogHeader>
          {confirmDialog?.action === 'addLine' ? (
            <AddLineForm orderId={orderId} categories={categories} onAdded={() => {
              setConfirmDialog(null);
              qc.invalidateQueries({ queryKey: ['orderbook-lines', orderId] });
            }} onCancel={() => setConfirmDialog(null)} />
          ) : (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
              <Button
                className={confirmDialog?.action === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
                onClick={() => {
                  if (confirmDialog?.action === 'delete') handleDeleteOrder();
                  else handleStatusChange(confirmDialog?.action === 'reopen' ? 'open' : confirmDialog?.action);
                }}
              >
                Confirm
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HeaderEditForm({ orderbook, suppliers, sites, customsAgents, onSaved, onCancel }) {
  const [form, setForm] = React.useState({
    supplier_id: orderbook?.supplier_id || "",
    supplier_site_id: orderbook?.supplier_site_id || "",
    order_date: orderbook?.order_date || "",
    currency: orderbook?.currency || "EUR",
    incoterms_type: orderbook?.incoterms_type || "FCA",
    incoterms_place: orderbook?.incoterms_place || "",
    payment_terms: orderbook?.payment_terms || "",
    notes: orderbook?.notes || "",
    customs_required: orderbook?.customs_required || false,
    customs_agent_id: orderbook?.customs_agent_id || "",
    customs_fee_eur_per_ton: orderbook?.customs_fee_eur_per_ton || "",
  });
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    const supplier = suppliers.find(s => s.id === form.supplier_id);
    const site = sites.find(s => s.id === form.supplier_site_id);
    const agent = customsAgents.find(a => a.id === form.customs_agent_id);
    
    await base44.entities.Orderbook.update(orderbook.id, {
      ...form,
      supplier_name: supplier?.name,
      supplier_site_name: site?.location_name,
      customs_agent_name: agent?.name,
      customs_fee_eur_per_ton: form.customs_fee_eur_per_ton ? parseFloat(form.customs_fee_eur_ton) : null
    });
    setSaving(false);
    onSaved?.();
  };

  return (
    <Card className="p-4 space-y-4 bg-amber-50 border-amber-200">
      <h3 className="font-semibold text-slate-800">Edit Order</h3>
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
      <div className="border-t pt-3 space-y-3">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.customs_required} onChange={(e) => setForm({...form, customs_required: e.target.checked})} /><span className="text-sm">Customs required?</span></label>
        {form.customs_required && (
          <>
            <Select value={form.customs_agent_id} onValueChange={(v) => setForm({...form, customs_agent_id: v})}>
              <SelectTrigger><SelectValue placeholder="Customs Agent" /></SelectTrigger>
              <SelectContent>{customsAgents.map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}</SelectContent>
            </Select>
            <Input type="number" placeholder="Customs Fee (EUR/ton)" step="0.01" value={form.customs_fee_eur_per_ton} onChange={(e) => setForm({...form, customs_fee_eur_per_ton: e.target.value})} />
          </>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={saving}><Save className="w-3 h-3 mr-1" /> Save</Button>
      </div>
    </Card>
  );
}

function AddLineForm({ orderId, categories, onAdded, onCancel }) {
  const [form, setForm] = React.useState({ category_id: "", planned_quantity_tons: "", unit_price_eur_per_ton: "", notes: "" });

  const handleAdd = async () => {
    if (!form.category_id || !form.planned_quantity_tons || !form.unit_price_eur_per_ton) {
      toast.error('Category, quantity, and price required');
      return;
    }
    const cat = categories.find(c => c.id === form.category_id);
    const lineValue = parseFloat(form.planned_quantity_tons) * parseFloat(form.unit_price_eur_per_ton);
    await base44.entities.OrderbookLine.create({
      orderbook_id: orderId,
      category_id: form.category_id,
      category_name: cat?.name_en || cat?.name_hu,
      planned_quantity_tons: parseFloat(form.planned_quantity_tons),
      unit_price_eur_per_ton: parseFloat(form.unit_price_eur_per_ton),
      line_value_eur: lineValue,
      notes: form.notes,
      sort_order: 0,
      allocated_quantity_tons: 0
    });
    toast.success('Line added');
    onAdded?.();
  };

  return (
    <div className="space-y-3">
      <Select value={form.category_id} onValueChange={(v) => setForm({...form, category_id: v})}>
        <SelectTrigger><SelectValue placeholder="Category *" /></SelectTrigger>
        <SelectContent>{categories.map(c => (<SelectItem key={c.id} value={c.id}>{c.name_en || c.name_hu}</SelectItem>))}</SelectContent>
      </Select>
      <Input type="number" placeholder="Planned (tons) *" step="0.01" value={form.planned_quantity_tons} onChange={(e) => setForm({...form, planned_quantity_tons: e.target.value})} />
      <Input type="number" placeholder="Unit Price (EUR/ton) *" step="0.01" value={form.unit_price_eur_per_ton} onChange={(e) => setForm({...form, unit_price_eur_per_ton: e.target.value})} />
      <Input type="text" placeholder="Notes" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleAdd}>Add Line</Button>
      </div>
    </div>
  );
}

function LineEditRow({ line, categories, onSave, onCancel }) {
  const [form, setForm] = React.useState({
    category_id: line.category_id,
    planned_quantity_tons: line.planned_quantity_tons,
    unit_price_eur_per_ton: line.unit_price_eur_per_ton,
    notes: line.notes || ""
  });

  return (
    <tr className="border-b bg-blue-50">
      <td colSpan="6" className="py-3 px-3">
        <div className="space-y-2">
          <Select value={form.category_id} onValueChange={(v) => setForm({...form, category_id: v})}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{categories.map(c => (<SelectItem key={c.id} value={c.id}>{c.name_en || c.name_hu}</SelectItem>))}</SelectContent>
          </Select>
          <div className="grid grid-cols-4 gap-2">
            <Input type="number" placeholder="Qty (t)" step="0.01" value={form.planned_quantity_tons} onChange={(e) => setForm({...form, planned_quantity_tons: parseFloat(e.target.value)})} />
            <Input type="number" placeholder="Price (EUR/t)" step="0.01" value={form.unit_price_eur_per_ton} onChange={(e) => setForm({...form, unit_price_eur_per_ton: parseFloat(e.target.value)})} />
            <Input type="text" placeholder="Notes" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} />
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
              <Button size="sm" className="bg-blue-600" onClick={() => onSave({...form, line_value_eur: form.planned_quantity_tons * form.unit_price_eur_per_ton})}>Save</Button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Copy, Trash2, Check, AlertCircle, Edit2, Plus } from "lucide-react";
import OrderbookTrucksSidebar from "./OrderbookTrucksSidebar";
import { toast } from "sonner";

const INCOTERMS = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'];

export default function OrderbookDetail({ orderId, onClose, onUpdated }) {
  const [form, setForm] = useState(null);
  const [lines, setLines] = useState([]);
  const [editingLineId, setEditingLineId] = useState(null);
  const [newLineForm, setNewLineForm] = useState({});
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef(null);
  const qc = useQueryClient();

  // Fetch orderbook
  const { data: orderbook, isLoading } = useQuery({
    queryKey: ['orderbook', orderId],
    queryFn: () => base44.entities.Orderbook.filter({ id: orderId }).then(r => r?.[0]),
    enabled: !!orderId,
  });

  // Fetch lines
  const { data: fetchedLines = [] } = useQuery({
    queryKey: ['orderbook-lines', orderId],
    queryFn: () => base44.entities.OrderbookLine.filter({ orderbook_id: orderId }),
    enabled: !!orderId,
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
    queryKey: ['sites'],
    queryFn: () => base44.entities.PartnerLocation.list(),
  });

  const { data: customsAgents = [] } = useQuery({
    queryKey: ['customs-agents'],
    queryFn: () => base44.entities.Partner.filter({ roles: 'customs_agent' }),
  });

  // Initialize form from orderbook
  useEffect(() => {
    if (orderbook && !form) {
      setForm(orderbook);
    }
  }, [orderbook, form]);

  // Update lines when fetched
  useEffect(() => {
    if (fetchedLines) {
      setLines(fetchedLines);
    }
  }, [fetchedLines]);

  // Auto-save draft orders
  const handleFormChange = (updates) => {
    const newForm = { ...form, ...updates };
    setForm(newForm);
    setSaved(false);

    if (newForm.status === 'draft') {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          await base44.entities.Orderbook.update(orderId, newForm);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        } catch (error) {
          toast.error('Save failed: ' + error.message);
        }
      }, 800);
    }
  };

  if (isLoading || !form) {
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-2xl p-6 text-center">Loading...</Card>
      </div>
    );
  }

  const isDraft = form.status === 'draft';
  const isOpen = form.status === 'open';
  const isClosed = form.status === 'closed';
  const isEditable = isDraft || isOpen; // Draft és Open orderek szerkeszthetőek

  const filteredSites = sites.filter(s => s.partner_id === form.supplier_id);
  const selectedSupplier = suppliers.find(s => s.id === form.supplier_id);
  const selectedSite = sites.find(s => s.id === form.supplier_site_id);

  const plannedTons = lines.reduce((s, l) => s + (l.planned_quantity_tons || 0), 0);
  const allocatedTons = lines.reduce((s, l) => s + (l.allocated_quantity_tons || 0), 0);
  const valueEUR = lines.reduce((s, l) => s + (l.line_value_eur || 0), 0);
  const customsFeeEUR = form.customs_required ? (form.customs_fee_eur_per_ton || 0) * plannedTons : 0;
  const grandTotalEUR = valueEUR + customsFeeEUR;

  const canOpenOrder = form.supplier_id && form.supplier_site_id && lines.length > 0;

  const handleOpenOrder = async () => {
    if (!canOpenOrder) {
      toast.error('Supplier, site, and at least 1 category line required');
      return;
    }
    try {
      await base44.entities.Orderbook.update(orderId, { status: 'open' });
      setForm({ ...form, status: 'open' });
      qc.invalidateQueries({ queryKey: ['orderbooks'] });
      toast.success('Order opened');
      onUpdated?.();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleCloseOrder = async () => {
    try {
      const user = await base44.auth.me();
      await base44.entities.Orderbook.update(orderId, {
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: user?.email
      });
      setForm({ ...form, status: 'closed' });
      setConfirmDialog(null);
      qc.invalidateQueries({ queryKey: ['orderbooks'] });
      toast.success('Order closed');
      onUpdated?.();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleReopenOrder = async () => {
    try {
      await base44.entities.Orderbook.update(orderId, { status: 'open', closed_at: null, closed_by: null });
      setForm({ ...form, status: 'open', closed_at: null, closed_by: null });
      setConfirmDialog(null);
      qc.invalidateQueries({ queryKey: ['orderbooks'] });
      toast.success('Order reopened');
      onUpdated?.();
    } catch (error) {
      toast.error(error.message);
    }
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

  const handleAddLine = async () => {
    if (!newLineForm.category_id || !newLineForm.planned_quantity_tons || !newLineForm.unit_price_eur_per_ton) {
      toast.error('Category, quantity, and price required');
      return;
    }
    try {
      const cat = categories.find(c => c.id === newLineForm.category_id);
      const lineValue = parseFloat(newLineForm.planned_quantity_tons) * parseFloat(newLineForm.unit_price_eur_per_ton);
      
      await base44.entities.OrderbookLine.create({
        orderbook_id: orderId,
        category_id: newLineForm.category_id,
        category_name: cat?.name_en || cat?.name_hu,
        planned_quantity_tons: parseFloat(newLineForm.planned_quantity_tons),
        unit_price_eur_per_ton: parseFloat(newLineForm.unit_price_eur_per_ton),
        line_value_eur: lineValue,
        notes: newLineForm.notes || "",
        sort_order: lines.length,
        allocated_quantity_tons: 0
      });
      
      qc.invalidateQueries({ queryKey: ['orderbook-lines', orderId] });
      setNewLineForm({});
      toast.success('Line added');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleUpdateLine = async (lineId, updates) => {
    try {
      await base44.entities.OrderbookLine.update(lineId, updates);
      qc.invalidateQueries({ queryKey: ['orderbook-lines', orderId] });
      setEditingLineId(null);
      toast.success('Line updated');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteLine = async (lineId) => {
    try {
      await base44.entities.OrderbookLine.delete(lineId);
      qc.invalidateQueries({ queryKey: ['orderbook-lines', orderId] });
      toast.success('Line deleted');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDuplicateLine = async (line) => {
    try {
      const newLine = { ...line };
      delete newLine.id;
      delete newLine.created_date;
      delete newLine.updated_date;
      delete newLine.created_by;
      newLine.sort_order = lines.length;
      
      await base44.entities.OrderbookLine.create(newLine);
      qc.invalidateQueries({ queryKey: ['orderbook-lines', orderId] });
      toast.success('Line duplicated');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-6xl mt-6 mb-6 flex-shrink-0">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-50 to-white border-b p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{form.order_no || 'Draft'}</h2>
            <p className="text-sm text-slate-500 mt-1">{selectedSupplier?.name || 'No supplier selected'}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={`text-xs font-semibold px-3 py-1 ${
              isDraft ? 'bg-amber-100 text-amber-800' :
              isOpen ? 'bg-blue-100 text-blue-800' :
              'bg-emerald-100 text-emerald-800'
            }`}>
              {form.status?.toUpperCase()}
            </Badge>
            {saved && <span className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> Saved</span>}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Section */}
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="font-semibold text-slate-800">Order Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Supplier */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Supplier *</label>
                {isEditable ? (
                  <Select value={form.supplier_id || ""} onValueChange={(v) => handleFormChange({ supplier_id: v, supplier_name: suppliers.find(s => s.id === v)?.name || "", supplier_site_id: "", supplier_site_name: "" })}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="px-3 py-2 bg-white rounded border border-slate-300 text-slate-800">{form.supplier_name || '-'}</div>
                )}
              </div>

              {/* Site */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Supplier Site *</label>
                {isEditable ? (
                  <Select value={form.supplier_site_id || ""} onValueChange={(v) => {
                    const site = filteredSites.find(s => s.id === v);
                    handleFormChange({ supplier_site_id: v, supplier_site_name: site?.location_name || "" });
                  }}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Select site" /></SelectTrigger>
                    <SelectContent>
                      {filteredSites.map(s => (<SelectItem key={s.id} value={s.id}>{s.location_name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="px-3 py-2 bg-white rounded border border-slate-300 text-slate-800">{form.supplier_site_name || '-'}</div>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Order Date *</label>
                <Input
                  type="date"
                  value={form.order_date || ""}
                  onChange={(e) => handleFormChange({ order_date: e.target.value })}
                  disabled={!isEditable}
                  className={!isEditable ? 'bg-slate-100 text-slate-600' : 'bg-white'}
                />
              </div>

              {/* Currency */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Currency</label>
                {isEditable ? (
                  <Select value={form.currency || "EUR"} onValueChange={(v) => handleFormChange({ currency: v })}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="HUF">HUF</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="px-3 py-2 bg-white rounded border border-slate-300 text-slate-800">{form.currency}</div>
                )}
              </div>

              {/* Incoterms Type */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Incoterms *</label>
                {isEditable ? (
                  <Select value={form.incoterms_type || ""} onValueChange={(v) => handleFormChange({ incoterms_type: v })}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INCOTERMS.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="px-3 py-2 bg-white rounded border border-slate-300 text-slate-800">{form.incoterms_type}</div>
                )}
              </div>

              {/* Incoterms Place */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Incoterms Place</label>
                <Input
                  placeholder="e.g., Budapest"
                  value={form.incoterms_place || ""}
                  onChange={(e) => handleFormChange({ incoterms_place: e.target.value })}
                  disabled={!isEditable}
                  className={!isEditable ? 'bg-slate-100 text-slate-600' : 'bg-white'}
                />
              </div>

              {/* Payment Terms */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Payment Terms</label>
                <Input
                  placeholder="e.g., Net 30"
                  value={form.payment_terms || ""}
                  onChange={(e) => handleFormChange({ payment_terms: e.target.value })}
                  disabled={!isEditable}
                  className={!isEditable ? 'bg-slate-100 text-slate-600' : 'bg-white'}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Notes</label>
              <Input
                placeholder="Order notes..."
                value={form.notes || ""}
                onChange={(e) => handleFormChange({ notes: e.target.value })}
                disabled={!isEditable}
                className={!isEditable ? 'bg-slate-100 text-slate-600' : 'bg-white'}
              />
            </div>

            {/* Site Address Preview */}
            {selectedSite && (
              <div className="p-3 bg-blue-50 rounded border border-blue-200 text-sm">
                <div className="font-medium text-blue-900 mb-1">Site Address</div>
                <div className="text-blue-800">
                  {selectedSite.address && <div>{selectedSite.address}</div>}
                  <div className="text-xs mt-1">{selectedSite.postal_code} {selectedSite.city}{selectedSite.region && `, ${selectedSite.region}`}{selectedSite.country && `, ${selectedSite.country}`}</div>
                </div>
              </div>
            )}

            {/* Customs Section */}
            <div className="border-t pt-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.customs_required || false}
                  onChange={(e) => handleFormChange({ customs_required: e.target.checked })}
                  disabled={!isEditable}
                />
                <span className="text-sm font-medium text-slate-800">Customs required?</span>
              </label>

              {form.customs_required && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Customs Agent</label>
                    {isEditable ? (
                      <Select value={form.customs_agent_id || ""} onValueChange={(v) => {
                        const agent = customsAgents.find(a => a.id === v);
                        handleFormChange({ customs_agent_id: v, customs_agent_name: agent?.name || "" });
                      }}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Select agent" /></SelectTrigger>
                        <SelectContent>
                          {customsAgents.map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="px-3 py-2 bg-white rounded border border-slate-300 text-slate-800">{form.customs_agent_name || '-'}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Fee (EUR/ton)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.customs_fee_eur_per_ton || ""}
                      onChange={(e) => handleFormChange({ customs_fee_eur_per_ton: e.target.value ? parseFloat(e.target.value) : 0 })}
                      disabled={!isEditable}
                      className={!isEditable ? 'bg-slate-100 text-slate-600' : 'bg-white'}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Category Lines */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800">Category Lines ({lines.length})</h3>

            {lines.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-slate-600 text-xs font-semibold">
                      <th className="text-left py-2 px-3">Category</th>
                      <th className="text-right py-2 px-3">Planned (t)</th>
                      <th className="text-right py-2 px-3">Price (EUR/t)</th>
                      <th className="text-right py-2 px-3">Value (EUR)</th>
                      <th className="text-right py-2 px-3">Allocated (t)</th>
                      <th className="text-left py-2 px-3">Notes</th>
                      {isEditable && <th className="text-right py-2 px-3 w-20">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map(line => (
                      <LineRow
                        key={line.id}
                        line={line}
                        categories={categories}
                        isEditing={editingLineId === line.id}
                        isEditable={isEditable}
                        onUpdate={(updates) => handleUpdateLine(line.id, updates)}
                        onDelete={() => handleDeleteLine(line.id)}
                        onDuplicate={() => handleDuplicateLine(line)}
                        onEditToggle={(id) => setEditingLineId(id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add Line Row */}
            {isEditable && (
              <div className="p-3 bg-blue-50 rounded border border-blue-200 space-y-2">
                <div className="font-medium text-blue-900 text-sm">Add Category Line</div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <Select value={newLineForm.category_id || ""} onValueChange={(v) => setNewLineForm({ ...newLineForm, category_id: v })}>
                    <SelectTrigger className="text-sm bg-white"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c.status === 'active').map(c => (<SelectItem key={c.id} value={c.id}>{c.name_en || c.name_hu}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Qty (t)" step="0.01" value={newLineForm.planned_quantity_tons || ""} onChange={(e) => setNewLineForm({ ...newLineForm, planned_quantity_tons: e.target.value })} className="text-sm" />
                  <Input type="number" placeholder="Price (EUR/t)" step="0.01" value={newLineForm.unit_price_eur_per_ton || ""} onChange={(e) => setNewLineForm({ ...newLineForm, unit_price_eur_per_ton: e.target.value })} className="text-sm" />
                  <Input type="text" placeholder="Notes" value={newLineForm.notes || ""} onChange={(e) => setNewLineForm({ ...newLineForm, notes: e.target.value })} className="text-sm md:col-span-2" />
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAddLine}>Add</Button>
                </div>
              </div>
            )}
          </div>

          {/* Summary Card */}
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-slate-50 border-blue-200">
            <h3 className="font-semibold text-slate-800 mb-3">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-slate-600 text-xs">Planned</div>
                <div className="text-2xl font-bold text-slate-800">{plannedTons.toFixed(2)}</div>
                <div className="text-xs text-slate-500">tons</div>
              </div>
              <div>
                <div className="text-slate-600 text-xs">Allocated</div>
                <div className="text-2xl font-bold text-blue-700">{allocatedTons.toFixed(2)}</div>
                <div className="text-xs text-slate-500">tons</div>
              </div>
              <div>
                <div className="text-slate-600 text-xs">Order Value</div>
                <div className="text-2xl font-bold text-slate-800">{(valueEUR / 1000).toFixed(1)}</div>
                <div className="text-xs text-slate-500">k EUR</div>
              </div>
              <div>
                <div className="text-slate-600 text-xs">Grand Total</div>
                <div className="text-2xl font-bold text-blue-700">{(grandTotalEUR / 1000).toFixed(1)}</div>
                <div className="text-xs text-slate-500">k EUR</div>
              </div>
            </div>
            {customsFeeEUR > 0 && (
              <div className="mt-3 pt-3 border-t text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Customs Fee ({plannedTons.toFixed(2)}t × {form.customs_fee_eur_per_ton} EUR/t):</span><span className="font-semibold">{customsFeeEUR.toFixed(0)} EUR</span></div>
              </div>
            )}
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            {isDraft && (
              <>
                <Button variant="destructive" size="sm" onClick={() => setConfirmDialog({ action: 'delete' })}>Delete</Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm" onClick={handleOpenOrder} disabled={!canOpenOrder}>
                  Open Order
                </Button>
              </>
            )}
            {isOpen && (
              <Button variant="outline" size="sm" onClick={() => setConfirmDialog({ action: 'close' })}>Close Order</Button>
            )}
            {isClosed && (
              <Button variant="outline" size="sm" onClick={() => setConfirmDialog({ action: 'reopen' })}>Reopen</Button>
            )}
          </div>
        </div>
      </Card>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              {confirmDialog?.action === 'delete' && 'Delete Order?'}
              {confirmDialog?.action === 'close' && 'Close Order?'}
              {confirmDialog?.action === 'reopen' && 'Reopen Order?'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            {confirmDialog?.action === 'delete' && 'This cannot be undone. All lines will be deleted.'}
            {confirmDialog?.action === 'close' && 'Order will move to Closed status.'}
            {confirmDialog?.action === 'reopen' && 'Order will return to Open status.'}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button
              size="sm"
              className={confirmDialog?.action === 'delete' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}
              onClick={() => {
                if (confirmDialog?.action === 'delete') handleDeleteOrder();
                else if (confirmDialog?.action === 'close') handleCloseOrder();
                else if (confirmDialog?.action === 'reopen') handleReopenOrder();
              }}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LineRow({ line, categories, isEditing, isEditable, onUpdate, onDelete, onDuplicate, onEditToggle }) {
  const [form, setForm] = useState(line);
  const category = categories.find(c => c.id === line.category_id);

  if (isEditing) {
    return (
      <tr className="border-b bg-blue-50">
        <td colSpan="7" className="py-3 px-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Input disabled value={category?.name_en || category?.name_hu || ''} className="text-sm bg-white" />
            <Input type="number" placeholder="Qty (t)" step="0.01" value={form.planned_quantity_tons} onChange={(e) => setForm({ ...form, planned_quantity_tons: parseFloat(e.target.value) || 0 })} className="text-sm bg-white" />
            <Input type="number" placeholder="Price (EUR/t)" step="0.01" value={form.unit_price_eur_per_ton} onChange={(e) => setForm({ ...form, unit_price_eur_per_ton: parseFloat(e.target.value) || 0 })} className="text-sm bg-white" />
            <Input type="text" placeholder="Notes" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="text-sm bg-white md:col-span-2" />
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => onEditToggle(null)}>Cancel</Button>
              <Button size="sm" className="bg-blue-600 text-white" onClick={() => {
                onUpdate({ ...form, line_value_eur: form.planned_quantity_tons * form.unit_price_eur_per_ton });
              }}>Save</Button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b hover:bg-slate-50">
      <td className="py-3 px-3 font-medium text-slate-800">{category?.name_en || category?.name_hu}</td>
      <td className="text-right py-3 px-3 text-slate-600">{line.planned_quantity_tons?.toFixed(2)}</td>
      <td className="text-right py-3 px-3 text-slate-600">{line.unit_price_eur_per_ton?.toFixed(2)}</td>
      <td className="text-right py-3 px-3 font-semibold text-slate-800">{(line.line_value_eur || 0).toFixed(0)}</td>
      <td className="text-right py-3 px-3 text-blue-600 font-semibold">{(line.allocated_quantity_tons || 0).toFixed(2)}</td>
      <td className="py-3 px-3 text-slate-600 text-xs">{line.notes || '-'}</td>
      {isEditable && (
        <td className="text-right py-3 px-3 space-x-1 flex justify-end">
          <button onClick={() => onEditToggle(line.id)} className="text-blue-600 hover:text-blue-800 p-1"><Edit2 className="w-4 h-4" /></button>
          <button onClick={() => onDuplicate()} className="text-slate-600 hover:text-slate-800 p-1"><Copy className="w-4 h-4" /></button>
          <button onClick={() => onDelete()} className="text-red-600 hover:text-red-800 p-1"><Trash2 className="w-4 h-4" /></button>
        </td>
      )}
    </tr>
  );
}
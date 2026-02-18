import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { ArrowLeft, Plus, Save, X, Trash2, AlertTriangle } from "lucide-react";
import ProductPicker from "@/components/products/ProductPicker";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function OrderDetail({ order, onBack }) {
  const [showLineForm, setShowLineForm] = useState(false);
  const [editLine, setEditLine] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, message: "", action: null, cascade: false });
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const qc = useQueryClient();

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ["orderLines", order.id],
    queryFn: () => base44.entities.OrderLine.filter({ order_id: order.id }),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const handleCheckDependencies = async () => {
    setDeleting(true);
    try {
      const res = await base44.functions.invoke('deleteOrArchiveEntity', {
        entityName: 'PurchaseOrder',
        entityId: order.id,
        requestedAction: 'HARD_DELETE',
        reason: ''
      });

      if (res.data.canCascadeDelete) {
        // Order has only lines, ask for confirmation
        setDeleteDialog({
          open: true,
          message: `Rendelés ${res.data.dependencies['Order Lines']} tétellel. Törlöd a rendelést és az összes tételt?`,
          action: 'HARD_DELETE',
          cascade: true
        });
      } else if (res.status === 409) {
        // Has logistics/finance/receipts, offer archive only
        toast.error('Logisztikai/pénzügyi linkek miatt csak archiválható');
        setDeleteDialog({
          open: true,
          message: `Rendelés logisztikai, pénzügyi vagy bevételezési linkekkel kapcsolódik. Csak archiválható.`,
          action: 'ARCHIVE'
        });
      } else {
        toast.error(res.data?.message || 'Ismeretlen hiba');
        setDeleteDialog({ open: false, message: "", action: null, cascade: false });
      }
    } catch (error) {
      toast.error(`Hiba: ${error.message}`);
      setDeleteDialog({ open: false, message: "", action: null, cascade: false });
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      const res = await base44.functions.invoke('deleteOrArchiveEntity', {
        entityName: 'PurchaseOrder',
        entityId: order.id,
        requestedAction: deleteDialog.action,
        reason: deleteReason || 'User deletion'
      });

      if (res.data.success || res.status === 200) {
        toast.success('Rendelés sikeresen törlve');
        setDeleteDialog({ open: false, message: "", action: null, cascade: false });
        qc.invalidateQueries({ queryKey: ["orders"] });
        setTimeout(() => onBack(), 500);
      } else if (res.status === 403) {
        toast.error('Nincs jogosultság a törléshez');
      } else if (res.status === 409) {
        toast.error('A rendelésnek vannak függőségei. Archiválás szükséges.');
        setDeleteDialog({
          open: true,
          message: `Rendelés logisztikai, pénzügyi vagy bevételezési linkekkel kapcsolódik. Csak archiválható.`,
          action: 'ARCHIVE'
        });
      } else {
        toast.error(res.data?.message || res.data?.error || 'Ismeretlen hiba');
      }
    } catch (error) {
      toast.error(`Hiba: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { header: "Product / Termék", key: "product_name" },
    { header: "HS Code / VTSZ", key: "hs_code" },
    { header: "Ordered / Rendelt", render: (r) => `${r.ordered_quantity} t` },
    { header: "Delivered / Szállított", render: (r) => `${r.delivered_quantity || 0} t` },
    { header: "Remaining / Maradvány", render: (r) => `${(r.ordered_quantity - (r.delivered_quantity || 0)).toFixed(2)} t` },
    { header: "Unit Price / Egységár", render: (r) => r.unit_price ? `${r.unit_price} ${r.currency || "EUR"}` : "-" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack} className="text-[#8b949e] hover:text-white p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-[#e6edf3]">
              {order.order_number || `PO-${order.id?.slice(0, 6)}`}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-[#8b949e]">{order.supplier_name}</span>
              <StatusBadge status={order.status} />
            </div>
          </div>
        </div>
        {!order.locked && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCheckDependencies}
            disabled={deleting}
            className="border-red-600 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-1" /> {deleting ? 'Feldolgozás...' : 'Törlés'}
          </Button>
        )}
      </div>

      {/* Order summary cards */}
       <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
         <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
           <p className="text-xs font-medium text-slate-500 uppercase">Incoterms</p>
           <p className="text-sm font-semibold text-slate-900 mt-1">{order.incoterms}</p>
         </div>
         <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
           <p className="text-xs font-medium text-slate-500 uppercase">Date / Dátum</p>
           <p className="text-sm font-semibold text-slate-900 mt-1">{order.order_date}</p>
         </div>
         <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
           <p className="text-xs font-medium text-slate-500 uppercase">Total Ordered</p>
           <p className="text-sm font-semibold text-slate-900 mt-1">{order.total_ordered_tons?.toFixed(2) || 0} t</p>
         </div>
         <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
           <p className="text-xs font-medium text-slate-500 uppercase">Status</p>
           <div className="mt-1"><StatusBadge status={order.status} /></div>
         </div>
       </div>

      {/* Order lines */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-[#e6edf3]">Order Lines / Tételek</h3>
          <Button size="sm" onClick={() => { setEditLine(null); setShowLineForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-xs">
            <Plus className="w-3 h-3" /> Add Line
          </Button>
        </div>
        {showLineForm && (
          <OrderLineForm
            order={order}
            item={editLine}
            products={products}
            onClose={() => setShowLineForm(false)}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ["orderLines", order.id] });
              setShowLineForm(false);
            }}
          />
        )}
        <DataTable columns={columns} data={lines} isLoading={isLoading} onRowClick={(r) => { setEditLine(r); setShowLineForm(true); }} />
      </div>

      {/* Delete/Archive Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => {
        if (!open) {
          setDeleteDialog({ open: false, message: "", action: null, cascade: false });
          setDeleteReason("");
        }
      }}>
        <DialogContent className="bg-[#22272e] border-[#2d333b]">
          <DialogHeader>
            <DialogTitle className="text-[#e6edf3] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              {deleteDialog.action === 'ARCHIVE' ? 'Rendelés archiválása' : deleteDialog.cascade ? 'Rendelés + tételek törlése' : 'Rendelés törlése'}
            </DialogTitle>
            <DialogDescription className="text-[#8b949e]">
              {deleteDialog.message}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialog({ open: false, message: "", action: null, cascade: false })} 
              disabled={deleting}
              className="border-[#2d333b] text-[#8b949e]"
            >
              Mégsem
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className={deleteDialog.action === 'ARCHIVE' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {deleting ? 'Feldolgozás...' : deleteDialog.action === 'ARCHIVE' ? 'Archivál' : deleteDialog.cascade ? 'Törlés tételekkel' : 'Törlés'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderLineForm({ order, item, products, onClose, onSaved }) {
  const [form, setForm] = useState(item || {
    order_id: order.id, order_number: order.order_number || `PO-${order.id?.slice(0, 6)}`,
    product_id: "", product_name: "", hs_code: "",
    ordered_quantity: "", delivered_quantity: 0,
    unit_price: "", currency: "EUR"
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const data = {
      ...form,
      ordered_quantity: Number(form.ordered_quantity) || 0,
      delivered_quantity: Number(form.delivered_quantity) || 0,
      unit_price: Number(form.unit_price) || 0,
    };
    if (item?.id) await base44.entities.OrderLine.update(item.id, data);
    else await base44.entities.OrderLine.create(data);
    setSaving(false);
    onSaved();
  };

  return (
     <div className="bg-white border border-slate-200 rounded-lg p-4 mb-3 space-y-3 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-slate-700 text-xs font-medium">Product *</Label>
          <ProductPicker
            products={products}
            value={form.product_id}
            dark={false}
            onChange={(p) => {
              set("product_id", p.id);
              set("product_name", `${p.category_name} ${p.diameter || ""} ${p.factory_code || ""}`.trim());
              set("hs_code", p?.hs_code || "");
            }}
          />
        </div>
        <div>
          <Label className="text-slate-700 text-xs font-medium">Ordered Qty (tons) *</Label>
          <Input type="number" className="bg-white border-slate-200 text-slate-900" value={form.ordered_quantity} onChange={(e) => set("ordered_quantity", e.target.value)} />
        </div>
        <div>
          <Label className="text-slate-700 text-xs font-medium">Unit Price</Label>
          <Input type="number" className="bg-white border-slate-200 text-slate-900" value={form.unit_price} onChange={(e) => set("unit_price", e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose} className="border-slate-200 text-slate-600">Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white"><Save className="w-3 h-3 mr-1" /> Save</Button>
      </div>
    </div>
  );
}
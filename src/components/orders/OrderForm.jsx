import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, Save } from "lucide-react";

const INCOTERMS = ["EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FAS", "FOB", "CFR", "CIF"];

export default function OrderForm({ item, onClose, onSaved }) {
  const [form, setForm] = useState(item || {
    order_number: "", supplier_id: "", supplier_name: "",
    incoterms: "EXW", order_date: new Date().toISOString().split("T")[0],
    status: "draft", notes: "", total_ordered_tons: 0
  });
  const [saving, setSaving] = useState(false);

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const all = await base44.entities.Partner.list();
      return all.filter((p) => (p.roles || []).includes("supplier"));
    },
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    if (item?.id) await base44.entities.PurchaseOrder.update(item.id, form);
    else await base44.entities.PurchaseOrder.create(form);
    setSaving(false);
    onSaved();
  };

  const lbl = "text-slate-600 text-xs font-semibold";
  const inp = "bg-white border-[#c6ccda] text-slate-800";

  return (
    <div className="bg-[#f5f7fa] border border-[rgba(46,58,90,0.12)] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">{item ? "Edit Order" : "New Order / Új rendelés"}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label className={lbl}>Order Number</Label>
          <Input className={inp} value={form.order_number} onChange={(e) => set("order_number", e.target.value)} placeholder="Auto-generated if empty" />
        </div>
        <div>
          <Label className={lbl}>Supplier / Beszállító *</Label>
          <Select value={form.supplier_id} onValueChange={(v) => {
            const s = suppliers.find((s) => s.id === v);
            set("supplier_id", v); set("supplier_name", s?.name || "");
          }}>
            <SelectTrigger className={inp}><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="bg-white border-[#c6ccda]">
              {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={lbl}>Incoterms</Label>
          <Select value={form.incoterms} onValueChange={(v) => set("incoterms", v)}>
            <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white border-[#c6ccda]">
              {INCOTERMS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={lbl}>Order Date *</Label>
          <Input type="date" className={inp} value={form.order_date} onChange={(e) => set("order_date", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white border-[#c6ccda]">
              <SelectItem value="draft">Draft / Tervezet</SelectItem>
              <SelectItem value="confirmed">Confirmed / Visszaigazolt</SelectItem>
              <SelectItem value="partial">Partial / Részleges</SelectItem>
              <SelectItem value="completed">Completed / Teljesített</SelectItem>
              <SelectItem value="cancelled">Cancelled / Törölve</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Label className={lbl}>Notes</Label>
          <Textarea className={`${inp} h-16`} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} className="border-[#c6ccda] text-slate-600">Cancel</Button>
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white gap-2"><Save className="w-4 h-4" /> Save</Button>
      </div>
    </div>
  );
}
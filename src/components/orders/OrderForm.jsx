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

  return (
    <div className="bg-[#1a1e23] border border-[#2d333b] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#e6edf3]">{item ? "Edit Order" : "New Order / Új rendelés"}</h3>
        <button onClick={onClose} className="text-[#8b949e] hover:text-white"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label className="text-[#8b949e] text-xs">Order Number</Label>
          <Input className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.order_number} onChange={(e) => set("order_number", e.target.value)} placeholder="Auto-generated if empty" />
        </div>
        <div>
          <Label className="text-[#8b949e] text-xs">Supplier / Beszállító *</Label>
          <Select value={form.supplier_id} onValueChange={(v) => {
            const s = suppliers.find((s) => s.id === v);
            set("supplier_id", v); set("supplier_name", s?.name || "");
          }}>
            <SelectTrigger className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="bg-[#22272e] border-[#2d333b]">
              {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[#8b949e] text-xs">Incoterms</Label>
          <Select value={form.incoterms} onValueChange={(v) => set("incoterms", v)}>
            <SelectTrigger className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#22272e] border-[#2d333b]">
              {INCOTERMS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[#8b949e] text-xs">Order Date *</Label>
          <Input type="date" className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.order_date} onChange={(e) => set("order_date", e.target.value)} />
        </div>
        <div>
          <Label className="text-[#8b949e] text-xs">Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#22272e] border-[#2d333b]">
              <SelectItem value="draft">Draft / Tervezet</SelectItem>
              <SelectItem value="confirmed">Confirmed / Visszaigazolt</SelectItem>
              <SelectItem value="partial">Partial / Részleges</SelectItem>
              <SelectItem value="completed">Completed / Teljesített</SelectItem>
              <SelectItem value="cancelled">Cancelled / Törölve</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Label className="text-[#8b949e] text-xs">Notes</Label>
          <Textarea className="bg-[#22272e] border-[#2d333b] text-[#e6edf3] h-16" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} className="border-[#2d333b] text-[#8b949e]">Cancel</Button>
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white gap-2"><Save className="w-4 h-4" /> Save</Button>
      </div>
    </div>
  );
}
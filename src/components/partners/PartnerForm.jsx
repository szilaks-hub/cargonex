import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const ALL_ROLES = [
  { value: "supplier", label: "Supplier / Beszállító" },
  { value: "customer", label: "Customer / Vevő" },
  { value: "carrier", label: "Carrier / Fuvarozó" },
  { value: "customs_agent", label: "Customs Agent / Vámügynök" },
];

export default function PartnerForm({ item, onClose, onSaved }) {
  const [form, setForm] = useState(item || {
    name: "", roles: [], tax_number: "", eu_vat: "",
    country: "", city: "", address: "", postal_code: "",
    phone: "", email: "", website: "", notes: "", status: "active"
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleRole = (role) => {
    const roles = form.roles || [];
    set("roles", roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role]);
  };

  const handleSave = async () => {
    setSaving(true);
    if (item?.id) {
      await base44.entities.Partner.update(item.id, form);
    } else {
      await base44.entities.Partner.create(form);
    }
    setSaving(false);
    onSaved();
  };

  const handleDelete = async () => {
    if (item?.id) { await base44.entities.Partner.delete(item.id); onSaved(); }
  };

  return (
    <div className="bg-[#1a1e23] border border-[#2d333b] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#e6edf3]">{item ? "Edit Partner" : "New Partner / Új partner"}</h3>
        <button onClick={onClose} className="text-[#8b949e] hover:text-white"><X className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="sm:col-span-2 lg:col-span-3">
          <Label className="text-[#8b949e] text-xs mb-2 block">Roles / Szerepek *</Label>
          <div className="flex flex-wrap gap-4">
            {ALL_ROLES.map((r) => (
              <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={(form.roles || []).includes(r.value)}
                  onCheckedChange={() => toggleRole(r.value)}
                  className="border-[#2d333b]"
                />
                <span className="text-sm text-[#e6edf3]">{r.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-[#8b949e] text-xs">Name / Név *</Label>
          <Input className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <Label className="text-[#8b949e] text-xs">Tax Number</Label>
          <Input className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.tax_number} onChange={(e) => set("tax_number", e.target.value)} />
        </div>
        <div>
          <Label className="text-[#8b949e] text-xs">EU VAT</Label>
          <Input className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.eu_vat} onChange={(e) => set("eu_vat", e.target.value)} />
        </div>
        <div>
          <Label className="text-[#8b949e] text-xs">Country / Ország</Label>
          <Input className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.country} onChange={(e) => set("country", e.target.value)} />
        </div>
        <div>
          <Label className="text-[#8b949e] text-xs">City / Város</Label>
          <Input className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.city} onChange={(e) => set("city", e.target.value)} />
        </div>
        <div>
          <Label className="text-[#8b949e] text-xs">Address / Cím</Label>
          <Input className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.address} onChange={(e) => set("address", e.target.value)} />
        </div>
        <div>
          <Label className="text-[#8b949e] text-xs">Phone / Telefon</Label>
          <Input className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div>
          <Label className="text-[#8b949e] text-xs">Email</Label>
          <Input className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div>
          <Label className="text-[#8b949e] text-xs">Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#22272e] border-[#2d333b]">
              <SelectItem value="active">Active / Aktív</SelectItem>
              <SelectItem value="inactive">Inactive / Inaktív</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Label className="text-[#8b949e] text-xs">Notes / Megjegyzés</Label>
          <Textarea className="bg-[#22272e] border-[#2d333b] text-[#e6edf3] h-20" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <div>{item?.id && <Button variant="ghost" onClick={handleDelete} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2"><Trash2 className="w-4 h-4" /> Delete</Button>}</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="border-[#2d333b] text-[#8b949e]">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white gap-2"><Save className="w-4 h-4" /> Save</Button>
        </div>
      </div>
    </div>
  );
}
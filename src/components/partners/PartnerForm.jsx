import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import CountryPicker, { guessCountryFromVat } from "./CountryPicker";

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

  const lbl = "text-slate-600 text-xs font-semibold";
  const inp = "bg-white border-[#c6ccda] text-slate-800";

  return (
    <div className="bg-[#f5f7fa] border border-[rgba(46,58,90,0.12)] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">{item ? "Edit Partner" : "New Partner / Új partner"}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="sm:col-span-2 lg:col-span-3">
          <Label className={`${lbl} mb-2 block`}>Roles / Szerepek *</Label>
          <div className="flex flex-wrap gap-4">
            {ALL_ROLES.map((r) => (
              <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={(form.roles || []).includes(r.value)}
                  onCheckedChange={() => toggleRole(r.value)}
                />
                <span className="text-sm text-slate-700">{r.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label className={lbl}>Name / Név *</Label>
          <Input className={inp} value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Tax Number</Label>
          <Input className={inp} value={form.tax_number} onChange={(e) => set("tax_number", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>EU VAT</Label>
          <Input className={inp} value={form.eu_vat} onChange={(e) => set("eu_vat", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Country / Ország</Label>
          <Input className={inp} value={form.country} onChange={(e) => set("country", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>City / Város</Label>
          <Input className={inp} value={form.city} onChange={(e) => set("city", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Address / Cím</Label>
          <Input className={inp} value={form.address} onChange={(e) => set("address", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Phone / Telefon</Label>
          <Input className={inp} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Email</Label>
          <Input className={inp} value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white border-[#c6ccda]">
              <SelectItem value="active">Active / Aktív</SelectItem>
              <SelectItem value="inactive">Inactive / Inaktív</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Label className={lbl}>Notes / Megjegyzés</Label>
          <Textarea className={`${inp} h-20`} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <div>{item?.id && <Button variant="ghost" onClick={handleDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2"><Trash2 className="w-4 h-4" /> Delete</Button>}</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="border-[#c6ccda] text-slate-600">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white gap-2"><Save className="w-4 h-4" /> Save</Button>
        </div>
      </div>
    </div>
  );
}
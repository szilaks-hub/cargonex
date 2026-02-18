import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save } from "lucide-react";

const INCOTERMS = ["EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FAS", "FOB", "CFR", "CIF"];
const COUNTRIES = ["Hungary", "Slovakia", "Romania", "Poland", "Croatia", "Slovenia", "Austria", "Serbia", "Italy", "Germany", "Czech Republic"];

export default function FreightSheetForm({ item, onClose, onSaved }) {
  const [form, setForm] = useState(item || {
    carrier_id: "", carrier_name: "",
    supplier_id: "", supplier_name: "",
    supplier_location_id: "", supplier_location_name: "",
    origin_country: "",
    destination_country: "",
    valid_from: new Date().toISOString().split("T")[0],
    valid_to: "",
    open_ended: true,
    currency: "EUR",
    default_load_tons: 24,
    incoterms: "FCA",
    notes: "",
    status: "active"
  });
  const [saving, setSaving] = useState(false);

  const { data: partners = [] } = useQuery({ queryKey: ["partners"], queryFn: () => base44.entities.Partner.list() });
  const { data: locations = [] } = useQuery({ queryKey: ["allLocations"], queryFn: () => base44.entities.PartnerLocation.list() });

  const carriers = partners.filter(p => (p.roles || []).includes("carrier"));
  const suppliers = partners.filter(p => (p.roles || []).includes("supplier"));
  const supplierLocations = locations.filter(l => l.partner_id === form.supplier_id);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, default_load_tons: Number(form.default_load_tons) || 24 };
    if (item?.id) await base44.entities.FreightSheet.update(item.id, data);
    else await base44.entities.FreightSheet.create(data);
    setSaving(false);
    onSaved();
  };

  const lbl = "text-slate-600 text-xs font-semibold";
  const inp = "bg-white border-[#c6ccda] text-slate-800";

  return (
    <div className="bg-[#f5f7fa] border border-[rgba(46,58,90,0.12)] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">{item ? "Edit Freight Sheet" : "New Freight Sheet / Új Fuvarozási Lap"}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label className={lbl}>Carrier / Fuvarozó *</Label>
          <Select value={form.carrier_id} onValueChange={(v) => {
            const c = carriers.find(c => c.id === v);
            set("carrier_id", v); set("carrier_name", c?.name || "");
          }}>
            <SelectTrigger className={inp}><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="bg-white border-[#c6ccda]">
              {carriers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={lbl}>Supplier / Beszállító</Label>
          <Select value={form.supplier_id} onValueChange={(v) => {
            const s = suppliers.find(s => s.id === v);
            set("supplier_id", v); set("supplier_name", s?.name || "");
            set("supplier_location_id", ""); set("supplier_location_name", ""); set("origin_country", "");
          }}>
            <SelectTrigger className={inp}><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="bg-white border-[#c6ccda]">
              {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={lbl}>Supplier Site / Telephely *</Label>
          <Select value={form.supplier_location_id} onValueChange={(v) => {
            const l = supplierLocations.find(l => l.id === v);
            set("supplier_location_id", v);
            set("supplier_location_name", l?.location_name || "");
            set("origin_country", l?.country || "");
          }}>
            <SelectTrigger className={inp}><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="bg-white border-[#c6ccda]">
              {supplierLocations.map(l => <SelectItem key={l.id} value={l.id}>{l.location_name} {l.city ? `– ${l.city}` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={lbl}>Origin Country / Feladó ország</Label>
          <Input className="bg-slate-100 border-[#c6ccda] text-slate-500" value={form.origin_country} readOnly />
        </div>
        <div>
          <Label className={lbl}>Destination Country / Célország *</Label>
          <Select value={form.destination_country} onValueChange={(v) => set("destination_country", v)}>
            <SelectTrigger className={inp}><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="bg-white border-[#c6ccda]">
              {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={lbl}>Incoterms</Label>
          <Select value={form.incoterms} onValueChange={(v) => set("incoterms", v)}>
            <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white border-[#c6ccda]">
              {INCOTERMS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={lbl}>Valid From / Érvényes ettől *</Label>
          <Input type="date" className={inp} value={form.valid_from} onChange={(e) => set("valid_from", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Valid To / Érvényes eddig</Label>
          <Input type="date" className={inp} value={form.valid_to} disabled={form.open_ended} onChange={(e) => set("valid_to", e.target.value)} />
          <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
            <Checkbox checked={form.open_ended} onCheckedChange={(v) => { set("open_ended", v); if (v) set("valid_to", ""); }} />
            <span className="text-xs text-slate-500">Visszavonásig érvényes</span>
          </label>
        </div>
        <div>
          <Label className={lbl}>Default Load / Alap kiterheltség (t)</Label>
          <Input type="number" className={inp} value={form.default_load_tons} onChange={(e) => set("default_load_tons", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Currency / Deviza</Label>
          <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
            <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white border-[#c6ccda]">
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="HUF">HUF</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={lbl}>Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white border-[#c6ccda]">
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Label className={lbl}>Notes / Megjegyzés</Label>
          <Textarea className={`${inp} h-14`} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} className="border-[#c6ccda] text-slate-600">Cancel</Button>
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Save className="w-4 h-4" /> Save
        </Button>
      </div>
    </div>
  );
}
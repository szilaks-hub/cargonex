import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save, Trash2 } from "lucide-react";

const INCOTERMS = ["EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FAS", "FOB", "CFR", "CIF"];
const COUNTRIES = ["HU", "SK", "RO", "PL", "HR", "SI", "RS", "AT", "DE", "CZ", "BG", "UA", "BA", "ME", "MK", "AL"];

export default function FreightSheetForm({ item, onClose, onSaved, forceDraft = false }) {
  const isDraft = !item?.id || item?.status === "draft" || forceDraft;

  const [form, setForm] = useState(item ? {
    ...item,
    status: forceDraft ? "draft" : item.status,
    sheet_number: forceDraft ? "" : item.sheet_number,
  } : {
    sheet_number: "",
    carrier_id: "", carrier_name: "",
    supplier_id: "", supplier_name: "",
    supplier_site_id: "", supplier_site_name: "",
    origin_country: "", origin_city: "", origin_address: "",
    destination_country: "",
    incoterms: "FCA",
    valid_from: new Date().toISOString().split("T")[0],
    valid_to: "",
    valid_until_revoked: true,
    currency: "EUR",
    default_load_tons: 24,
    notes: "",
    status: "draft"
  });
  const [saving, setSaving] = useState(false);

  const { data: partners = [] } = useQuery({ queryKey: ["partners"], queryFn: () => base44.entities.Partner.list() });
  const { data: locations = [] } = useQuery({ queryKey: ["allLocations"], queryFn: () => base44.entities.PartnerLocation.list() });

  const carriers = partners.filter(p => (p.roles || []).includes("carrier"));
  const suppliers = partners.filter(p => (p.roles || []).includes("supplier"));
  const supplierSites = locations.filter(l => l.partner_id === form.supplier_id);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (form.supplier_site_id) {
      const site = locations.find(l => l.id === form.supplier_site_id);
      if (site) {
        set("origin_country", site.country || "");
        set("origin_city", site.city || "");
        set("supplier_site_name", site.location_name);
      }
    }
  }, [form.supplier_site_id]);

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, default_load_tons: Number(form.default_load_tons) || 24 };
    if (item?.id && !forceDraft) {
      await base44.entities.FreightSheet.update(item.id, data);
    } else {
      await base44.entities.FreightSheet.create(data);
    }
    setSaving(false);
    onSaved();
  };

  const handleDelete = async () => {
    if (item?.id) { await base44.entities.FreightSheet.delete(item.id); onSaved(); }
  };

  const lbl = "text-slate-600 text-xs font-semibold";
  const inp = "bg-white border-[#c6ccda] text-slate-800";
  const inpRO = "bg-slate-100 border-[#c6ccda] text-slate-500";

  return (
    <div className="bg-[#f5f7fa] border border-[rgba(46,58,90,0.12)] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            {forceDraft ? "Új verzió / New Version" : item ? "Edit Freight Sheet" : "Új fuvarozási lap / New Freight Sheet"}
          </h3>
          {forceDraft && (
            <p className="text-xs text-amber-600 mt-0.5">A régi lap archiválva lesz. Az új lap Draft státuszban jön létre.</p>
          )}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label className={lbl}>Sheet No. / Lap sorszám</Label>
          <Input className={inp} value={form.sheet_number} onChange={e => set("sheet_number", e.target.value)} placeholder="Auto if empty" />
        </div>
        <div>
          <Label className={lbl}>Carrier / Fuvarozó *</Label>
          <Select value={form.carrier_id} onValueChange={v => {
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
          <Select value={form.supplier_id} onValueChange={v => {
            const s = suppliers.find(s => s.id === v);
            set("supplier_id", v); set("supplier_name", s?.name || ""); set("supplier_site_id", "");
          }}>
            <SelectTrigger className={inp}><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="bg-white border-[#c6ccda]">
              {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={lbl}>Supplier Site / Telephely</Label>
          <Select value={form.supplier_site_id} onValueChange={v => set("supplier_site_id", v)} disabled={!form.supplier_id}>
            <SelectTrigger className={inp}><SelectValue placeholder="Select site..." /></SelectTrigger>
            <SelectContent className="bg-white border-[#c6ccda]">
              {supplierSites.map(l => <SelectItem key={l.id} value={l.id}>{l.location_name}{l.city ? ` – ${l.city}` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={lbl}>Origin Country / Feladó ország</Label>
          <Input className={inpRO} value={form.origin_country} readOnly placeholder="Auto from site" />
        </div>
        <div>
          <Label className={lbl}>Origin City / Feladó város</Label>
          <Input className={inp} value={form.origin_city} onChange={e => set("origin_city", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Origin Address / Feladó cím</Label>
          <Input className={inp} value={form.origin_address} onChange={e => set("origin_address", e.target.value)} placeholder="pl. Rumski put 27." />
        </div>
        <div>
          <Label className={lbl}>Destination Country / Célország *</Label>
          <Select value={form.destination_country} onValueChange={v => set("destination_country", v)}>
            <SelectTrigger className={inp}><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="bg-white border-[#c6ccda]">
              {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={lbl}>Incoterms</Label>
          <Select value={form.incoterms} onValueChange={v => set("incoterms", v)}>
            <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white border-[#c6ccda]">
              {INCOTERMS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={lbl}>Valid From / Érvényes ettől *</Label>
          <Input type="date" className={inp} value={form.valid_from} onChange={e => set("valid_from", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Valid To / Érvényes eddig</Label>
          <Input type="date" className={inp} value={form.valid_to} onChange={e => set("valid_to", e.target.value)} disabled={form.valid_until_revoked} />
          <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
            <Checkbox checked={!!form.valid_until_revoked} onCheckedChange={v => set("valid_until_revoked", v)} />
            <span className="text-xs text-slate-500">Visszavonásig érvényes</span>
          </label>
        </div>
        <div>
          <Label className={lbl}>Default Load / Alap kiterh. (t)</Label>
          <Input type="number" className={inp} value={form.default_load_tons} onChange={e => set("default_load_tons", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Currency / Deviza</Label>
          <Select value={form.currency} onValueChange={v => set("currency", v)}>
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
          <Select value={form.status} onValueChange={v => set("status", v)}>
            <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white border-[#c6ccda]">
              <SelectItem value="draft">Draft / Tervezet</SelectItem>
              <SelectItem value="active">Active / Aktív</SelectItem>
              <SelectItem value="archived">Archived / Archivált</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="lg:col-span-3">
          <Label className={lbl}>Notes / Megjegyzés</Label>
          <Textarea className={`${inp} h-14`} value={form.notes} onChange={e => set("notes", e.target.value)} />
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <div>
          {item?.id && !forceDraft && item.status === "draft" && (
            <Button variant="ghost" onClick={handleDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2">
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="border-[#c6ccda] text-slate-600">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2" style={{ background: "linear-gradient(135deg,#e05a2b,#c0392b)", color: "#fff" }}>
            <Save className="w-4 h-4" /> {forceDraft ? "Verzió létrehozása" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
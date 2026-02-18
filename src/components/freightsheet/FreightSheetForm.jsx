import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save, Trash2, Lock, Unlock, MapPin } from "lucide-react";

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

  // Origin locked state – if editing an existing sheet, assume locked unless user unlocks
  const [originLocked, setOriginLocked] = useState(!!item?.supplier_site_id);
  const [saving, setSaving] = useState(false);

  const { data: partners = [] } = useQuery({ queryKey: ["partners"], queryFn: () => base44.entities.Partner.list() });
  const { data: locations = [] } = useQuery({ queryKey: ["allLocations"], queryFn: () => base44.entities.PartnerLocation.list() });

  const carriers = partners.filter(p => (p.roles || []).includes("carrier") && p.status !== "inactive" && p.status !== "archived");
  const suppliers = partners.filter(p => (p.roles || []).includes("supplier") && p.status !== "inactive" && p.status !== "archived");

  // Only active sites
  const activeSites = locations.filter(l => !l.status || l.status === "active");
  const supplierSites = activeSites.filter(l => l.partner_id === form.supplier_id);

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

  const handleLock = () => {
    if (!form.supplier_site_id) return;
    setOriginLocked(true);
  };
  const handleUnlock = () => setOriginLocked(false);

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
  const inpRO = "bg-slate-100 border-[#c6ccda] text-slate-500 cursor-not-allowed";

  const selectedSite = locations.find(l => l.id === form.supplier_site_id);

  return (
    <div className="bg-[#f5f7fa] border border-[rgba(46,58,90,0.12)] rounded-xl p-5 space-y-5">
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

      {/* ── STEP 1: Carrier + Origin ────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">1. LÉPÉS</span>
          <span className="text-xs font-semibold text-slate-600">Fuvarozó & Rakodóhely meghatározása</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label className={lbl}>Sheet No.</Label>
            <Input className={inp} value={form.sheet_number} onChange={e => set("sheet_number", e.target.value)} placeholder="Auto if empty" />
          </div>
          <div>
            <Label className={lbl}>Carrier / Fuvarozó *</Label>
            <Select value={form.carrier_id} onValueChange={v => {
              const c = carriers.find(c => c.id === v);
              set("carrier_id", v); set("carrier_name", c?.name || "");
            }} disabled={originLocked}>
              <SelectTrigger className={originLocked ? inpRO : inp}><SelectValue placeholder="Válassz..." /></SelectTrigger>
              <SelectContent className="bg-white border-[#c6ccda]">
                {carriers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className={lbl}>Supplier / Beszállító</Label>
            <Select value={form.supplier_id} onValueChange={v => {
              const s = suppliers.find(s => s.id === v);
              set("supplier_id", v); set("supplier_name", s?.name || ""); set("supplier_site_id", ""); setOriginLocked(false);
            }} disabled={originLocked}>
              <SelectTrigger className={originLocked ? inpRO : inp}><SelectValue placeholder="Válassz..." /></SelectTrigger>
              <SelectContent className="bg-white border-[#c6ccda]">
                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Supplier Site + lock */}
          <div className="sm:col-span-2 lg:col-span-2">
            <Label className={lbl}>Supplier Site / Telephely (Rakodóhely) *</Label>
            {originLocked ? (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 flex items-center gap-2 bg-green-50 border border-green-300 rounded-md px-3 py-2">
                  <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-green-800 truncate">{selectedSite?.location_name || form.supplier_site_name}</div>
                    <div className="text-xs text-green-600">{form.origin_country} · {form.origin_city}</div>
                  </div>
                  <span className="ml-auto text-[10px] bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-bold flex-shrink-0">FIXÁLT</span>
                </div>
                {isDraft && (
                  <button onClick={handleUnlock} className="text-slate-400 hover:text-amber-600 p-2 rounded hover:bg-amber-50 transition-colors" title="Feloldás / Unlock">
                    <Unlock className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <Select value={form.supplier_site_id} onValueChange={v => set("supplier_site_id", v)} disabled={!form.supplier_id}>
                  <SelectTrigger className={inp}><SelectValue placeholder="Telephely kiválasztása..." /></SelectTrigger>
                  <SelectContent className="bg-white border-[#c6ccda]">
                    {supplierSites.map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.location_name}{l.city ? ` – ${l.city}` : ""}{l.country ? ` (${l.country})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={handleLock}
                  disabled={!form.supplier_site_id}
                  className={`p-2 rounded transition-colors flex-shrink-0 ${form.supplier_site_id ? "text-green-600 hover:bg-green-50 hover:text-green-800" : "text-slate-300 cursor-not-allowed"}`}
                  title="Rakodóhely fixálása"
                >
                  <Lock className="w-4 h-4" />
                </button>
              </div>
            )}
            {!originLocked && form.supplier_site_id && (
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Kattints a <strong>🔒</strong> ikonra a rakodóhely fixálásához
              </p>
            )}
          </div>

          <div>
            <Label className={lbl}>Origin Country</Label>
            <Input className={inpRO} value={form.origin_country} readOnly placeholder="Auto from site" />
          </div>
          <div>
            <Label className={lbl}>Origin City / Feladó város</Label>
            <Input className={originLocked ? inpRO : inp} value={form.origin_city} onChange={e => set("origin_city", e.target.value)} readOnly={originLocked} />
          </div>
          <div>
            <Label className={lbl}>Origin Address</Label>
            <Input className={originLocked ? inpRO : inp} value={form.origin_address} onChange={e => set("origin_address", e.target.value)} readOnly={originLocked} placeholder="pl. Rumski put 27." />
          </div>
        </div>
      </div>

      {/* ── STEP 2: Destination + Validity ──────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">2. LÉPÉS</span>
          <span className="text-xs font-semibold text-slate-600">Célország, érvényesség, feltételek</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label className={lbl}>Destination Country / Célország *</Label>
            <Select value={form.destination_country} onValueChange={v => set("destination_country", v)}>
              <SelectTrigger className={inp}><SelectValue placeholder="Válassz..." /></SelectTrigger>
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
            <Label className={lbl}>Paritás helye / Incoterms Place</Label>
            <Input className={inp} placeholder="pl. Dabas, Budapest" value={form.incoterms_place || ""} onChange={e => set("incoterms_place", e.target.value)} />
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
          <div className="lg:col-span-2">
            <Label className={lbl}>Notes / Megjegyzés</Label>
            <Textarea className={`${inp} h-14`} value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
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
          <Button onClick={handleSave} disabled={saving || !form.carrier_id || !form.destination_country || !form.valid_from} className="gap-2" style={{ background: "linear-gradient(135deg,#e05a2b,#c0392b)", color: "#fff" }}>
            <Save className="w-4 h-4" /> {forceDraft ? "Verzió létrehozása" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
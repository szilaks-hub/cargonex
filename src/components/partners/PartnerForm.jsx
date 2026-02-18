import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, Trash2, Truck, ShieldCheck, Package, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import CountryPicker, { guessCountryFromVat } from "./CountryPicker";

const ALL_ROLES = [
  { value: "supplier",      label: "Supplier / Beszállító",        icon: Package,      color: "text-blue-600" },
  { value: "customer",      label: "Customer / Vevő",              icon: Users,        color: "text-green-600" },
  { value: "carrier",       label: "Carrier / Fuvarozó",           icon: Truck,        color: "text-orange-600" },
  { value: "customs_agent", label: "Customs Agent / Vámügynök",    icon: ShieldCheck,  color: "text-purple-600" },
];

const lbl = "text-slate-600 text-xs font-semibold";
const inp = "bg-white border-[#c6ccda] text-slate-800";

function SectionTitle({ icon: Icon, label, color }) {
  return (
    <div className={`flex items-center gap-2 mt-4 mb-2 pb-1 border-b border-slate-200`}>
      <Icon className={`w-4 h-4 ${color}`} />
      <span className={`text-xs font-bold uppercase tracking-wide ${color}`}>{label}</span>
    </div>
  );
}

export default function PartnerForm({ item, onClose, onSaved }) {
  const [form, setForm] = useState(item || {
    name: "", short_name: "", roles: [], tax_number: "", eu_vat: "",
    countries: [], country: "", city: "", address: "", postal_code: "",
    phone: "", email: "", website: "", notes: "", status: "active",
    carrier_type: "truck", carrier_license_number: "", carrier_license_expiry: "",
    carrier_insurance_number: "", carrier_insurance_expiry: "",
    carrier_truck_count: "", carrier_capacity_tons: "", carrier_notes: "",
    customs_agent_aeo_number: "", customs_agent_aeo_expiry: "",
    customs_agent_license_number: "",
    supplier_payment_terms: "", supplier_currency: "EUR", supplier_incoterms: "EXW",
    supplier_bank_name: "", supplier_bank_account: "", supplier_bank_swift: "", supplier_bank_iban: "",
    customer_credit_limit: "", customer_credit_currency: "EUR", customer_payment_terms: "",
    customer_delivery_preferences: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const has = (role) => (form.roles || []).includes(role);

  useEffect(() => {
    const vatGuess = guessCountryFromVat(form.eu_vat) || guessCountryFromVat(form.tax_number);
    if (vatGuess) {
      setForm((f) => {
        if ((f.countries || []).includes(vatGuess.code)) return f;
        return { ...f, countries: [...(f.countries || []), vatGuess.code] };
      });
    }
  }, [form.eu_vat, form.tax_number]);

  const toggleRole = (role) => {
    const roles = form.roles || [];
    set("roles", roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role]);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form };
    // cast numeric fields
    if (data.carrier_truck_count) data.carrier_truck_count = Number(data.carrier_truck_count);
    if (data.carrier_capacity_tons) data.carrier_capacity_tons = Number(data.carrier_capacity_tons);
    if (data.customer_credit_limit) data.customer_credit_limit = Number(data.customer_credit_limit);
    if (item?.id) await base44.entities.Partner.update(item.id, data);
    else await base44.entities.Partner.create(data);
    setSaving(false);
    onSaved();
  };

  const handleDelete = async () => {
    if (item?.id) { await base44.entities.Partner.delete(item.id); onSaved(); }
  };

  return (
    <div className="bg-[#f5f7fa] border border-[rgba(46,58,90,0.12)] rounded-xl p-5 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-800">{item ? "Edit Partner" : "New Partner / Új partner"}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
      </div>

      {/* Roles */}
      <div>
        <Label className={`${lbl} mb-2 block`}>Roles / Szerepek *</Label>
        <div className="flex flex-wrap gap-3">
          {ALL_ROLES.map((r) => {
            const active = has(r.value);
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => toggleRole(r.value)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                  active
                    ? "border-blue-400 bg-blue-50 text-blue-700 shadow-sm"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-400"
                }`}
              >
                <r.icon className={`w-4 h-4 ${active ? r.color : "text-slate-400"}`} />
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Base fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
        <div>
          <Label className={lbl}>Name / Név *</Label>
          <Input className={inp} value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Short Name / Rövid név</Label>
          <Input className={inp} placeholder="Optional" value={form.short_name} onChange={(e) => set("short_name", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Tax Number / Adószám</Label>
          <Input className={inp} value={form.tax_number} onChange={(e) => set("tax_number", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>EU VAT</Label>
          <Input className={inp} value={form.eu_vat} onChange={(e) => set("eu_vat", e.target.value)} />
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
          <Label className={lbl}>Website</Label>
          <Input className={inp} value={form.website} onChange={(e) => set("website", e.target.value)} />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <CountryPicker value={form.countries || []} onChange={(v) => set("countries", v)} required />
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
          <Textarea className={`${inp} h-16`} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>

      {/* CARRIER fields */}
      {has("carrier") && (
        <div>
          <SectionTitle icon={Truck} label="Carrier / Fuvarozó adatok" color="text-orange-600" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className={lbl}>License Number / Engedély száma</Label>
              <Input className={inp} value={form.carrier_license_number} onChange={(e) => set("carrier_license_number", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>License Expiry / Engedély lejárata</Label>
              <Input type="date" className={inp} value={form.carrier_license_expiry} onChange={(e) => set("carrier_license_expiry", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Insurance Number / Biztosítás</Label>
              <Input className={inp} value={form.carrier_insurance_number} onChange={(e) => set("carrier_insurance_number", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Insurance Expiry / Biztosítás lejárata</Label>
              <Input type="date" className={inp} value={form.carrier_insurance_expiry} onChange={(e) => set("carrier_insurance_expiry", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Truck Count / Járművek száma</Label>
              <Input type="number" className={inp} value={form.carrier_truck_count} onChange={(e) => set("carrier_truck_count", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Capacity (t) / Teherbírás</Label>
              <Input type="number" className={inp} value={form.carrier_capacity_tons} onChange={(e) => set("carrier_capacity_tons", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Carrier Type / Fuvarozás módja</Label>
              <Select value={form.carrier_type || "truck"} onValueChange={(v) => set("carrier_type", v)}>
                <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white border-[#c6ccda]">
                  <SelectItem value="truck">Truck / Közúti</SelectItem>
                  <SelectItem value="rail">Rail / Vasúti</SelectItem>
                  <SelectItem value="sea">Sea / Tengeri</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Label className={lbl}>Carrier Notes / Megjegyzés</Label>
              <Input className={inp} value={form.carrier_notes} onChange={(e) => set("carrier_notes", e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMS AGENT fields */}
      {has("customs_agent") && (
        <div>
          <SectionTitle icon={ShieldCheck} label="Customs Agent / Vámügynöki adatok" color="text-purple-600" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className={lbl}>AEO Number / AEO szám</Label>
              <Input className={inp} value={form.customs_agent_aeo_number} onChange={(e) => set("customs_agent_aeo_number", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>AEO Expiry / AEO lejárat</Label>
              <Input type="date" className={inp} value={form.customs_agent_aeo_expiry} onChange={(e) => set("customs_agent_aeo_expiry", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>License Number / Engedély</Label>
              <Input className={inp} value={form.customs_agent_license_number} onChange={(e) => set("customs_agent_license_number", e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* SUPPLIER fields */}
      {has("supplier") && (
        <div>
          <SectionTitle icon={Package} label="Supplier / Beszállítói adatok" color="text-blue-600" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className={lbl}>Payment Terms / Fizetési feltételek</Label>
              <Input className={inp} placeholder="pl. NET30" value={form.supplier_payment_terms} onChange={(e) => set("supplier_payment_terms", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Currency / Deviza</Label>
              <Select value={form.supplier_currency || "EUR"} onValueChange={(v) => set("supplier_currency", v)}>
                <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white border-[#c6ccda]">
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="HUF">HUF</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={lbl}>Default Incoterms</Label>
              <Select value={form.supplier_incoterms || "EXW"} onValueChange={(v) => set("supplier_incoterms", v)}>
                <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white border-[#c6ccda]">
                  {["EXW","FCA","CPT","CIP","DAP","DPU","DDP","FAS","FOB","CFR","CIF"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={lbl}>Bank Name / Bank neve</Label>
              <Input className={inp} value={form.supplier_bank_name} onChange={(e) => set("supplier_bank_name", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Bank Account / Számlaszám</Label>
              <Input className={inp} value={form.supplier_bank_account} onChange={(e) => set("supplier_bank_account", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>SWIFT / BIC</Label>
              <Input className={inp} value={form.supplier_bank_swift} onChange={(e) => set("supplier_bank_swift", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>IBAN</Label>
              <Input className={inp} value={form.supplier_bank_iban} onChange={(e) => set("supplier_bank_iban", e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER fields */}
      {has("customer") && (
        <div>
          <SectionTitle icon={Users} label="Customer / Vevői adatok" color="text-green-600" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className={lbl}>Payment Terms / Fizetési feltételek</Label>
              <Input className={inp} placeholder="pl. NET15" value={form.customer_payment_terms} onChange={(e) => set("customer_payment_terms", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Credit Limit / Hitelkeret</Label>
              <Input type="number" className={inp} value={form.customer_credit_limit} onChange={(e) => set("customer_credit_limit", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Credit Currency</Label>
              <Select value={form.customer_credit_currency || "EUR"} onValueChange={(v) => set("customer_credit_currency", v)}>
                <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white border-[#c6ccda]">
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="HUF">HUF</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Label className={lbl}>Delivery Preferences / Szállítási igények</Label>
              <Input className={inp} value={form.customer_delivery_preferences} onChange={(e) => set("customer_delivery_preferences", e.target.value)} />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-3">
        <div>{item?.id && <Button variant="ghost" onClick={handleDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2"><Trash2 className="w-4 h-4" /> Delete</Button>}</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="border-[#c6ccda] text-slate-600">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white gap-2"><Save className="w-4 h-4" /> Save</Button>
        </div>
      </div>
    </div>
  );
}
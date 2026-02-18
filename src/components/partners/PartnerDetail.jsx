import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/ui/DataTable";
import { ArrowLeft, Plus, X, Save, Trash2, MapPin, UserCircle, ShieldCheck, Truck, Package, Users, AlertTriangle } from "lucide-react";
import CountryPicker, { COUNTRIES } from "./CountryPicker";
import { format, parseISO, isBefore, addDays } from "date-fns";

export default function PartnerDetail({ partner, onBack, onUpdated }) {
  const [showLocForm, setShowLocForm] = useState(false);
  const [editLoc, setEditLoc] = useState(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editContact, setEditContact] = useState(null);
  const qc = useQueryClient();

  const { data: locations = [], isLoading: loadLoc } = useQuery({
    queryKey: ["locations", partner.id],
    queryFn: () => base44.entities.PartnerLocation.filter({ partner_id: partner.id }),
  });

  const { data: contacts = [], isLoading: loadContact } = useQuery({
    queryKey: ["contacts", partner.id],
    queryFn: () => base44.entities.ContactPerson.filter({ partner_id: partner.id }),
  });

  const { data: fees = [], isLoading: loadFees } = useQuery({
    queryKey: ["fees", partner.id],
    queryFn: () => base44.entities.CustomsAgentFee.filter({ partner_id: partner.id }),
    enabled: (partner.roles || []).includes("customs_agent"),
  });

  const isCustomsAgent = (partner.roles || []).includes("customs_agent");
  const isCarrier = (partner.roles || []).includes("carrier");
  const isSupplier = (partner.roles || []).includes("supplier");
  const isCustomer = (partner.roles || []).includes("customer");

  const partnerCountries = partner.countries || (partner.country ? [partner.country] : []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack} className="text-slate-500 hover:text-slate-800 p-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">{partner.name}</h2>
          <div className="flex flex-wrap gap-1 mt-1">
            {(partner.roles || []).map((r) => (
              <Badge key={r} variant="outline" className="border-slate-300 text-slate-500 text-[10px]">{r.replace(/_/g, " ")}</Badge>
            ))}
            {partnerCountries.map((code) => {
              const c = COUNTRIES.find((x) => x.code === code);
              return c ? (
                <Badge key={code} className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">{c.en}</Badge>
              ) : null;
            })}
          </div>
        </div>
      </div>

      {/* Role-specific info panels */}
      <RoleInfoPanels partner={partner} isCarrier={isCarrier} isCustomsAgent={isCustomsAgent} isSupplier={isSupplier} isCustomer={isCustomer} />

      {/* Locations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-500" /> Locations / Telephelyek</h3>
          <Button size="sm" onClick={() => { setEditLoc(null); setShowLocForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-xs">
            <Plus className="w-3 h-3" /> Add
          </Button>
        </div>
        {showLocForm && <LocationForm partner={partner} item={editLoc} onClose={() => setShowLocForm(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ["locations", partner.id] }); setShowLocForm(false); }} />}
        <DataTable
          columns={[
            { header: "Name", key: "location_name" },
            { header: "Country", key: "country", render: (r) => r.country || "-" },
            { header: "Region", key: "region", render: (r) => r.region || "-" },
            { header: "City", key: "city", render: (r) => r.city || "-" },
            { header: "Address", key: "address", render: (r) => r.address || "-" },
            { header: "Primary", render: (r) => r.is_primary ? <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 border text-[10px]">Primary</Badge> : "-" },
          ]}
          data={locations}
          isLoading={loadLoc}
          onRowClick={(r) => { setEditLoc(r); setShowLocForm(true); }}
        />
      </div>

      {/* Contacts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><UserCircle className="w-4 h-4 text-green-500" /> Contacts / Kapcsolattartók</h3>
          <Button size="sm" onClick={() => { setEditContact(null); setShowContactForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-xs">
            <Plus className="w-3 h-3" /> Add
          </Button>
        </div>
        {showContactForm && <ContactForm partner={partner} item={editContact} onClose={() => setShowContactForm(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ["contacts", partner.id] }); setShowContactForm(false); }} />}
        <DataTable
          columns={[
            { header: "Name / Név", key: "full_name" },
            { header: "Position", key: "position", render: (r) => r.position || "-" },
            { header: "Phone", key: "phone", render: (r) => r.phone || "-" },
            { header: "Email", key: "email", render: (r) => r.email || "-" },
          ]}
          data={contacts}
          isLoading={loadContact}
          onRowClick={(r) => { setEditContact(r); setShowContactForm(true); }}
        />
      </div>

      {/* Customs Agent Fees */}
      {isCustomsAgent && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-500" /> Customs Agent Fees / Vámügynöki díjak
            </h3>
          </div>
          <CustomsAgentFees partnerId={partner.id} partnerName={partner.name} fees={fees} isLoading={loadFees} />
        </div>
      )}
    </div>
  );
}

function ExpiryBadge({ dateStr }) {
  if (!dateStr) return <span className="text-slate-400">-</span>;
  const d = parseISO(dateStr);
  const soon = isBefore(d, addDays(new Date(), 60));
  const expired = isBefore(d, new Date());
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
      expired ? "bg-red-100 text-red-700" : soon ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
    }`}>
      {(expired || soon) && <AlertTriangle className="w-3 h-3" />}
      {dateStr}
    </span>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{label}</span>
      <span className="text-sm text-slate-700 font-medium">{value}</span>
    </div>
  );
}

function RoleInfoPanels({ partner, isCarrier, isCustomsAgent, isSupplier, isCustomer }) {
  const panels = [];

  if (isCarrier && (partner.carrier_license_number || partner.carrier_truck_count)) {
    panels.push(
      <div key="carrier" className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Truck className="w-4 h-4 text-orange-600" />
          <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">Carrier / Fuvarozói adatok</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <InfoRow label="License No." value={partner.carrier_license_number} />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">License Expiry</span>
            <ExpiryBadge dateStr={partner.carrier_license_expiry} />
          </div>
          <InfoRow label="Insurance No." value={partner.carrier_insurance_number} />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Insurance Expiry</span>
            <ExpiryBadge dateStr={partner.carrier_insurance_expiry} />
          </div>
          <InfoRow label="Trucks / Járművek" value={partner.carrier_truck_count} />
          <InfoRow label="Capacity (t)" value={partner.carrier_capacity_tons} />
        </div>
      </div>
    );
  }

  if (isCustomsAgent && (partner.customs_agent_aeo_number || partner.customs_agent_license_number)) {
    panels.push(
      <div key="customs" className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Customs Agent / Vámügynöki adatok</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <InfoRow label="AEO Number" value={partner.customs_agent_aeo_number} />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">AEO Expiry</span>
            <ExpiryBadge dateStr={partner.customs_agent_aeo_expiry} />
          </div>
          <InfoRow label="License No." value={partner.customs_agent_license_number} />
        </div>
      </div>
    );
  }

  if (isSupplier && (partner.supplier_bank_name || partner.supplier_payment_terms)) {
    panels.push(
      <div key="supplier" className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Supplier / Beszállítói adatok</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <InfoRow label="Payment Terms" value={partner.supplier_payment_terms} />
          <InfoRow label="Currency" value={partner.supplier_currency} />
          <InfoRow label="Incoterms" value={partner.supplier_incoterms} />
          <InfoRow label="Bank Name" value={partner.supplier_bank_name} />
          <InfoRow label="Bank Account" value={partner.supplier_bank_account} />
          <InfoRow label="SWIFT" value={partner.supplier_bank_swift} />
          <InfoRow label="IBAN" value={partner.supplier_bank_iban} />
        </div>
      </div>
    );
  }

  if (isCustomer && (partner.customer_payment_terms || partner.customer_credit_limit)) {
    panels.push(
      <div key="customer" className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-green-600" />
          <span className="text-xs font-bold text-green-700 uppercase tracking-wide">Customer / Vevői adatok</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <InfoRow label="Payment Terms" value={partner.customer_payment_terms} />
          <InfoRow label="Credit Limit" value={partner.customer_credit_limit ? `${partner.customer_credit_limit} ${partner.customer_credit_currency || "EUR"}` : null} />
        </div>
      </div>
    );
  }

  if (!panels.length) return null;
  return <div className="space-y-3">{panels}</div>;
}

function LocationForm({ partner, item, onClose, onSaved }) {
  const [form, setForm] = useState(item || { partner_id: partner.id, partner_name: partner.name, location_name: "", country: "", region: "", city: "", address: "", postal_code: "", is_primary: false });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const lbl = "text-slate-600 text-xs font-semibold";
  const inp = "bg-white border-[#c6ccda] text-slate-800";

  const handleSave = async () => {
    setSaving(true);
    if (item?.id) await base44.entities.PartnerLocation.update(item.id, form);
    else await base44.entities.PartnerLocation.create(form);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="bg-[#f5f7fa] border border-[rgba(46,58,90,0.12)] rounded-lg p-4 mb-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div><Label className={lbl}>Name *</Label><Input className={inp} value={form.location_name} onChange={(e) => set("location_name", e.target.value)} /></div>
        <div className="sm:col-span-2">
          <CountryPicker
            value={form.country ? [form.country] : []}
            onChange={(v) => set("country", v[0] || "")}
            single
            label="Country / Ország"
            required
          />
        </div>
        <div><Label className={lbl}>Region</Label><Input className={inp} value={form.region} onChange={(e) => set("region", e.target.value)} /></div>
        <div><Label className={lbl}>City</Label><Input className={inp} value={form.city} onChange={(e) => set("city", e.target.value)} /></div>
        <div><Label className={lbl}>Address</Label><Input className={inp} value={form.address} onChange={(e) => set("address", e.target.value)} /></div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose} className="border-[#c6ccda] text-slate-600">Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white"><Save className="w-3 h-3 mr-1" /> Save</Button>
      </div>
    </div>
  );
}

function ContactForm({ partner, item, onClose, onSaved }) {
  const [form, setForm] = useState(item || { partner_id: partner.id, partner_name: partner.name, full_name: "", position: "", phone: "", email: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const lbl = "text-slate-600 text-xs font-semibold";
  const inp = "bg-white border-[#c6ccda] text-slate-800";

  const handleSave = async () => {
    setSaving(true);
    if (item?.id) await base44.entities.ContactPerson.update(item.id, form);
    else await base44.entities.ContactPerson.create(form);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="bg-[#f5f7fa] border border-[rgba(46,58,90,0.12)] rounded-lg p-4 mb-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div><Label className={lbl}>Name *</Label><Input className={inp} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} /></div>
        <div><Label className={lbl}>Position</Label><Input className={inp} value={form.position} onChange={(e) => set("position", e.target.value)} /></div>
        <div><Label className={lbl}>Phone</Label><Input className={inp} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
        <div><Label className={lbl}>Email</Label><Input className={inp} value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose} className="border-[#c6ccda] text-slate-600">Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white"><Save className="w-3 h-3 mr-1" /> Save</Button>
      </div>
    </div>
  );
}

function CustomsAgentFees({ partnerId, partnerName, fees, isLoading }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ partner_id: partnerId, partner_name: partnerName, period_from: "", period_to: "", fee_per_truck: "", currency: "EUR", notes: "" });
  const [saving, setSaving] = useState(false);
  const qcFees = useQueryClient();

  const openForm = (item) => {
    setEditItem(item);
    setForm(item || { partner_id: partnerId, partner_name: partnerName, period_from: "", period_to: "", fee_per_truck: "", currency: "EUR", notes: "" });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, fee_per_truck: Number(form.fee_per_truck) };
    if (editItem?.id) await base44.entities.CustomsAgentFee.update(editItem.id, data);
    else await base44.entities.CustomsAgentFee.create(data);
    setSaving(false);
    setShowForm(false);
    qcFees.invalidateQueries({ queryKey: ["fees", partnerId] });
  };

  const lbl = "text-slate-600 text-xs font-semibold";
  const inp = "bg-white border-[#c6ccda] text-slate-800";

  return (
    <div>
      <div className="flex justify-end mb-2">
        <Button size="sm" onClick={() => openForm(null)} className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-xs">
          <Plus className="w-3 h-3" /> Add
        </Button>
      </div>
      {showForm && (
        <div className="bg-[#f5f7fa] border border-[rgba(46,58,90,0.12)] rounded-lg p-4 mb-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><Label className={lbl}>From *</Label><Input type="date" className={inp} value={form.period_from} onChange={(e) => setForm({ ...form, period_from: e.target.value })} /></div>
            <div><Label className={lbl}>To</Label><Input type="date" className={inp} value={form.period_to} onChange={(e) => setForm({ ...form, period_to: e.target.value })} /></div>
            <div><Label className={lbl}>Fee/Truck *</Label><Input type="number" className={inp} value={form.fee_per_truck} onChange={(e) => setForm({ ...form, fee_per_truck: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="border-[#c6ccda] text-slate-600">Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white"><Save className="w-3 h-3 mr-1" /> Save</Button>
          </div>
        </div>
      )}
      <DataTable
        columns={[
          { header: "From", key: "period_from" },
          { header: "To", key: "period_to", render: (r) => r.period_to || "-" },
          { header: "Fee/Truck", render: (r) => `${r.fee_per_truck} ${r.currency || "EUR"}` },
          { header: "Notes", key: "notes", render: (r) => r.notes || "-" },
        ]}
        data={fees}
        isLoading={isLoading}
        onRowClick={openForm}
      />
    </div>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/ui/DataTable";
import { ArrowLeft, Plus, X, Save, Trash2, MapPin, UserCircle, ShieldCheck } from "lucide-react";
import CountryPicker, { COUNTRIES } from "./CountryPicker";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack} className="text-[#8b949e] hover:text-white p-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-[#e6edf3]">{partner.name}</h2>
          <div className="flex gap-1 mt-1">
            {(partner.roles || []).map((r) => (
              <Badge key={r} variant="outline" className="border-[#2d333b] text-[#8b949e] text-[10px]">{r.replace(/_/g, " ")}</Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Locations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-[#e6edf3] flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-400" /> Locations / Telephelyek</h3>
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
          <h3 className="text-sm font-medium text-[#e6edf3] flex items-center gap-2"><UserCircle className="w-4 h-4 text-green-400" /> Contacts / Kapcsolattartók</h3>
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
        <CustomsAgentFees partnerId={partner.id} partnerName={partner.name} fees={fees} isLoading={loadFees} />
      )}
    </div>
  );
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

  const handleSave = async () => {
    setSaving(true);
    if (item?.id) await base44.entities.ContactPerson.update(item.id, form);
    else await base44.entities.ContactPerson.create(form);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="bg-[#22272e] border border-[#2d333b] rounded-lg p-4 mb-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div><Label className="text-[#8b949e] text-xs">Name *</Label><Input className="bg-[#1a1e23] border-[#2d333b] text-[#e6edf3]" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} /></div>
        <div><Label className="text-[#8b949e] text-xs">Position</Label><Input className="bg-[#1a1e23] border-[#2d333b] text-[#e6edf3]" value={form.position} onChange={(e) => set("position", e.target.value)} /></div>
        <div><Label className="text-[#8b949e] text-xs">Phone</Label><Input className="bg-[#1a1e23] border-[#2d333b] text-[#e6edf3]" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
        <div><Label className="text-[#8b949e] text-xs">Email</Label><Input className="bg-[#1a1e23] border-[#2d333b] text-[#e6edf3]" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose} className="border-[#2d333b] text-[#8b949e]">Cancel</Button>
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

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[#e6edf3] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-400" /> Customs Agent Fees / Vámügynöki díjak
        </h3>
        <Button size="sm" onClick={() => openForm(null)} className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-xs">
          <Plus className="w-3 h-3" /> Add
        </Button>
      </div>
      {showForm && (
        <div className="bg-[#22272e] border border-[#2d333b] rounded-lg p-4 mb-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><Label className="text-[#8b949e] text-xs">From *</Label><Input type="date" className="bg-[#1a1e23] border-[#2d333b] text-[#e6edf3]" value={form.period_from} onChange={(e) => setForm({ ...form, period_from: e.target.value })} /></div>
            <div><Label className="text-[#8b949e] text-xs">To</Label><Input type="date" className="bg-[#1a1e23] border-[#2d333b] text-[#e6edf3]" value={form.period_to} onChange={(e) => setForm({ ...form, period_to: e.target.value })} /></div>
            <div><Label className="text-[#8b949e] text-xs">Fee/Truck *</Label><Input type="number" className="bg-[#1a1e23] border-[#2d333b] text-[#e6edf3]" value={form.fee_per_truck} onChange={(e) => setForm({ ...form, fee_per_truck: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="border-[#2d333b] text-[#8b949e]">Cancel</Button>
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
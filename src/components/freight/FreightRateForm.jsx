import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, Trash2 } from "lucide-react";

export default function FreightRateForm({ item, onClose, onSaved }) {
  const [form, setForm] = useState(item || {
    carrier_id: "", carrier_name: "", supplier_location_id: "", supplier_location_name: "",
    destination_country: "", destination_region: "", destination_city: "",
    foreign_rate: "", domestic_rate: "", currency: "EUR",
    capacity_tons: "", total_freight_cost: "",
    valid_from: "", valid_to: "", status: "active"
  });
  const [saving, setSaving] = useState(false);

  const { data: carriers = [] } = useQuery({
    queryKey: ["carriers"],
    queryFn: async () => {
      const all = await base44.entities.Partner.list();
      return all.filter((p) => (p.roles || []).includes("carrier"));
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["allLocations"],
    queryFn: () => base44.entities.PartnerLocation.list(),
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    const f = Number(form.foreign_rate) || 0;
    const d = Number(form.domestic_rate) || 0;
    set("total_freight_cost", f + d);
  }, [form.foreign_rate, form.domestic_rate]);

  const handleSave = async () => {
    setSaving(true);
    const data = {
      ...form,
      foreign_rate: Number(form.foreign_rate) || 0,
      domestic_rate: Number(form.domestic_rate) || 0,
      capacity_tons: Number(form.capacity_tons) || 0,
      total_freight_cost: (Number(form.foreign_rate) || 0) + (Number(form.domestic_rate) || 0),
    };
    if (item?.id) await base44.entities.FreightRate.update(item.id, data);
    else await base44.entities.FreightRate.create(data);
    setSaving(false);
    onSaved();
  };

  const handleDelete = async () => {
    if (item?.id) { await base44.entities.FreightRate.delete(item.id); onSaved(); }
  };

  const lbl = "text-slate-600 text-xs font-semibold";
  const inp = "bg-white border-[#c6ccda] text-slate-800";

  return (
    <div className="bg-[#f5f7fa] border border-[rgba(46,58,90,0.12)] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">{item ? "Edit Rate" : "New Freight Rate / Új fuvardíj"}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label className={lbl}>Carrier / Fuvarozó *</Label>
          <Select value={form.carrier_id} onValueChange={(v) => {
            const c = carriers.find((c) => c.id === v);
            set("carrier_id", v); set("carrier_name", c?.name || "");
          }}>
            <SelectTrigger className={inp}><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="bg-white border-[#c6ccda]">
              {carriers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={lbl}>Supplier Location / Rakodóhely</Label>
          <Select value={form.supplier_location_id} onValueChange={(v) => {
            const l = locations.find((l) => l.id === v);
            set("supplier_location_id", v); set("supplier_location_name", l ? `${l.partner_name} - ${l.location_name}` : "");
          }}>
            <SelectTrigger className={inp}><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="bg-white border-[#c6ccda]">
              {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.partner_name} - {l.location_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={lbl}>Dest. Country / Cél ország *</Label>
          <Input className={inp} value={form.destination_country} onChange={(e) => set("destination_country", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Dest. Region / Megye</Label>
          <Input className={inp} value={form.destination_region} onChange={(e) => set("destination_region", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Dest. City / Város</Label>
          <Input className={inp} value={form.destination_city} onChange={(e) => set("destination_city", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Foreign Rate *</Label>
          <Input type="number" className={inp} value={form.foreign_rate} onChange={(e) => set("foreign_rate", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Domestic Rate</Label>
          <Input type="number" className={inp} value={form.domestic_rate} onChange={(e) => set("domestic_rate", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Capacity (tons)</Label>
          <Input type="number" className={inp} value={form.capacity_tons} onChange={(e) => set("capacity_tons", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Total Freight Cost</Label>
          <Input disabled className="bg-slate-100 border-[#c6ccda] text-slate-500" value={form.total_freight_cost} />
        </div>
        <div>
          <Label className={lbl}>Currency</Label>
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
          <Label className={lbl}>Valid From</Label>
          <Input type="date" className={inp} value={form.valid_from} onChange={(e) => set("valid_from", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Valid To</Label>
          <Input type="date" className={inp} value={form.valid_to} onChange={(e) => set("valid_to", e.target.value)} />
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
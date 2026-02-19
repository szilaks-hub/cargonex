import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, Trash2 } from "lucide-react";
import ProductPicker from "@/components/products/ProductPicker";

export default function TruckForm({ item, onClose, onSaved, defaultOrderbookId, defaultOrderNo }) {
  const [form, setForm] = useState(item || {
    truck_number: "", expected_loading_date: "", actual_loading_date: "",
    product_id: "", product_name: "", planned_quantity_tons: "", actual_weight_tons: "",
    loading_location_id: "", loading_location_name: "",
    destination_country: "", destination_city: "",
    carrier_id: "", carrier_name: "", freight_rate_id: "",
    foreign_freight: "", domestic_freight: "",
    order_id: "", order_number: "",
    orderbook_id: defaultOrderbookId || "", orderbook_no: defaultOrderNo || "",
    customs_agent_id: "", customs_agent_name: "", customs_agent_fee: "",
    purchase_price: "", hs_code: "", status: "scheduled"
  });
  const [saving, setSaving] = useState(false);

  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => base44.entities.Product.list() });
  const { data: partners = [] } = useQuery({ queryKey: ["partners"], queryFn: () => base44.entities.Partner.list() });
  const { data: locations = [] } = useQuery({ queryKey: ["allLocations"], queryFn: () => base44.entities.PartnerLocation.list() });
  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => base44.entities.PurchaseOrder.list() });
  const { data: orderbooks = [] } = useQuery({ queryKey: ["orderbooks-list"], queryFn: () => base44.entities.Orderbook.filter({ status: "open" }) });
  const { data: freightRates = [] } = useQuery({ queryKey: ["freightRates"], queryFn: () => base44.entities.FreightRate.list() });
  const { data: agentFees = [] } = useQuery({ queryKey: ["allFees"], queryFn: () => base44.entities.CustomsAgentFee.list() });

  const carriers = partners.filter((p) => (p.roles || []).includes("carrier"));
  const customsAgents = partners.filter((p) => (p.roles || []).includes("customs_agent"));

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Auto-fetch freight rate when carrier changes
  useEffect(() => {
    if (form.carrier_id && form.destination_country) {
      const rate = freightRates.find((r) => r.carrier_id === form.carrier_id && r.destination_country === form.destination_country && r.status === "active");
      if (rate) {
        set("freight_rate_id", rate.id);
        set("foreign_freight", rate.foreign_rate);
        set("domestic_freight", rate.domestic_rate);
      }
    }
  }, [form.carrier_id, form.destination_country]);

  // Auto-fetch customs agent fee
  useEffect(() => {
    if (form.customs_agent_id) {
      const fee = agentFees.find((f) => f.partner_id === form.customs_agent_id);
      if (fee) set("customs_agent_fee", fee.fee_per_truck);
    }
  }, [form.customs_agent_id]);

  const handleSave = async () => {
    setSaving(true);
    const data = {
      ...form,
      planned_quantity_tons: Number(form.planned_quantity_tons) || 0,
      actual_weight_tons: Number(form.actual_weight_tons) || 0,
      foreign_freight: Number(form.foreign_freight) || 0,
      domestic_freight: Number(form.domestic_freight) || 0,
      customs_agent_fee: Number(form.customs_agent_fee) || 0,
      purchase_price: Number(form.purchase_price) || 0,
    };
    if (item?.id) await base44.entities.Truck.update(item.id, data);
    else await base44.entities.Truck.create(data);
    setSaving(false);
    onSaved();
  };

  const handleDelete = async () => {
    if (item?.id) { await base44.entities.Truck.delete(item.id); onSaved(); }
  };

  const lbl = "text-slate-600 text-xs font-semibold";
  const inp = "bg-white border-[#c6ccda] text-slate-800";
  const inpDark = "bg-[#22272e] border-[#2d333b] text-[#e6edf3]"; // keep for ProductPicker compatibility

  return (
    <div className="bg-[#f5f7fa] border border-[rgba(46,58,90,0.12)] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">{item ? "Edit Truck" : "New Truck / Új kamion"}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div>
          <Label className={lbl}>Truck Number</Label>
          <Input className={inp} value={form.truck_number} onChange={(e) => set("truck_number", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Expected Loading Date *</Label>
          <Input type="date" className={inp} value={form.expected_loading_date} onChange={(e) => set("expected_loading_date", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Actual Loading Date</Label>
          <Input type="date" className={inp} value={form.actual_loading_date} onChange={(e) => set("actual_loading_date", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Product / Termék *</Label>
          <ProductPicker
            products={products}
            value={form.product_id}
            dark={false}
            onChange={(p) => {
              set("product_id", p.id);
              set("product_name", `${p.category_name || ""} Ø${p.diameter || ""} ${p.factory_code || ""}`.trim());
              set("hs_code", p?.hs_code || "");
            }}
          />
        </div>
        <div>
          <Label className={lbl}>Planned Qty (t) *</Label>
          <Input type="number" className={inp} value={form.planned_quantity_tons} onChange={(e) => set("planned_quantity_tons", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Actual Weight (t)</Label>
          <Input type="number" className={inp} value={form.actual_weight_tons} onChange={(e) => set("actual_weight_tons", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Loading Location</Label>
          <Select value={form.loading_location_id} onValueChange={(v) => {
            const l = locations.find((l) => l.id === v);
            set("loading_location_id", v); set("loading_location_name", l ? `${l.partner_name} - ${l.location_name}` : "");
          }}>
            <SelectTrigger className={inp}><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="bg-white border-[#c6ccda]">
              {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.partner_name} - {l.location_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={lbl}>Dest. Country</Label>
          <Input className={inp} value={form.destination_country} onChange={(e) => set("destination_country", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Dest. City</Label>
          <Input className={inp} value={form.destination_city} onChange={(e) => set("destination_city", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Carrier / Fuvarozó</Label>
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
          <Label className={lbl}>Foreign Freight</Label>
          <Input type="number" className={inp} value={form.foreign_freight} onChange={(e) => set("foreign_freight", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Domestic Freight</Label>
          <Input type="number" className={inp} value={form.domestic_freight} onChange={(e) => set("domestic_freight", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Orderbook (Rendelés) *</Label>
          <Select value={form.orderbook_id} onValueChange={(v) => {
            const o = orderbooks.find((o) => o.id === v);
            set("orderbook_id", v); set("orderbook_no", o?.order_no || "");
          }}>
            <SelectTrigger className={inp}><SelectValue placeholder="Válassz rendelést..." /></SelectTrigger>
            <SelectContent className="bg-white border-[#c6ccda]">
              {orderbooks.map((o) => <SelectItem key={o.id} value={o.id}>{o.order_no || o.id?.slice(0, 8)} – {o.supplier_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={lbl}>Customs Agent / Vámügynök</Label>
          <Select value={form.customs_agent_id} onValueChange={(v) => {
            const a = customsAgents.find((a) => a.id === v);
            set("customs_agent_id", v); set("customs_agent_name", a?.name || "");
          }}>
            <SelectTrigger className={inp}><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="bg-white border-[#c6ccda]">
              {customsAgents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={lbl}>Customs Agent Fee</Label>
          <Input type="number" className={inp} value={form.customs_agent_fee} onChange={(e) => set("customs_agent_fee", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Purchase Price / ton</Label>
          <Input type="number" className={inp} value={form.purchase_price} onChange={(e) => set("purchase_price", e.target.value)} />
        </div>
        <div>
          <Label className={lbl}>Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white border-[#c6ccda]">
              <SelectItem value="scheduled">Scheduled / Tervezett</SelectItem>
              <SelectItem value="loaded">Loaded / Rakodott</SelectItem>
              <SelectItem value="in_transit">In Transit / Úton</SelectItem>
              <SelectItem value="customs">Customs / Vámon</SelectItem>
              <SelectItem value="closed">Closed / Lezárt</SelectItem>
              <SelectItem value="cancelled">Cancelled / Törölve</SelectItem>
            </SelectContent>
          </Select>
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
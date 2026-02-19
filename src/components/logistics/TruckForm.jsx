import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Save, Trash2, Package, Truck, MapPin, ShieldCheck } from "lucide-react";

const STATUS_LABELS = {
  booked: "Előjegyzett",
  loaded: "Megrakott",
  arrived_onsite: "Telephelyi",
  closed: "Lezárt",
  cancelled: "Törölve",
};

const COUNTRIES = ["HU", "DE", "AT", "SK", "RO", "HR", "SI", "PL", "CZ", "FR", "IT", "NL", "BE", "BG", "RS", "UA", "TR"];

export default function TruckForm({ item, onClose, onSaved, defaultOrderbookId, defaultOrderNo }) {
  const [tab, setTab] = useState("order");
  const [form, setForm] = useState(item || {
    truck_number: "",
    expected_loading_date: "",
    actual_loading_date: "",
    product_id: "", product_name: "",
    planned_quantity_tons: "", actual_weight_tons: "",
    destination_country: "", destination_city: "",
    carrier_id: "", carrier_name: "",
    applied_freight_sheet_id: "", applied_freight_sheet_line_id: "",
    freight_domestic_leg_snapshot: "", freight_foreign_leg_snapshot: "",
    freight_total_snapshot: "", freight_eur_per_ton_snapshot: "",
    orderbook_id: defaultOrderbookId || "", orderbook_no: defaultOrderNo || "",
    customs_agent_id: "", customs_agent_name: "", customs_agent_fee: "",
    purchase_price: "", hs_code: "",
    transit: false,
    status: "booked"
  });
  const [saving, setSaving] = useState(false);

  const { data: partners = [] } = useQuery({ queryKey: ["partners"], queryFn: () => base44.entities.Partner.list() });
  const { data: locations = [] } = useQuery({ queryKey: ["allLocations"], queryFn: () => base44.entities.PartnerLocation.list() });
  const { data: orderbooks = [] } = useQuery({ queryKey: ["orderbooks-list"], queryFn: () => base44.entities.Orderbook.filter({ status: "open" }) });
  const { data: orderbookLines = [] } = useQuery({
    queryKey: ["ob-lines-for-truck", form.orderbook_id],
    queryFn: () => base44.entities.OrderbookLine.filter({ orderbook_id: form.orderbook_id }),
    enabled: !!form.orderbook_id,
  });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: () => base44.entities.ProductCategory.list() });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => base44.entities.Product.list() });
  const { data: freightSheets = [] } = useQuery({ queryKey: ["freightSheets"], queryFn: () => base44.entities.FreightSheet.filter({ status: "active" }) });
  const { data: freightSheetLines = [] } = useQuery({
    queryKey: ["fslines-for-truck", form.applied_freight_sheet_id],
    queryFn: () => base44.entities.FreightSheetLine.filter({ sheet_id: form.applied_freight_sheet_id, status: "active" }),
    enabled: !!form.applied_freight_sheet_id,
  });
  const { data: agentFees = [] } = useQuery({ queryKey: ["allFees"], queryFn: () => base44.entities.CustomsAgentFee.list() });

  const carriers = partners.filter((p) => (p.roles || []).includes("carrier"));
  const customsAgents = partners.filter((p) => (p.roles || []).includes("customs_agent"));

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Auto-fill customs agent from orderbook
  useEffect(() => {
    if (!item && form.orderbook_id) {
      const ob = orderbooks.find(o => o.id === form.orderbook_id);
      if (ob && ob.customs_required && ob.customs_agent_id) {
        set("customs_agent_id", ob.customs_agent_id);
        set("customs_agent_name", ob.customs_agent_name || "");
        // Also fill loading location from supplier site
        if (ob.supplier_site_id) {
          const loc = locations.find(l => l.id === ob.supplier_site_id);
          if (loc) {
            set("loading_location_id", loc.id);
            set("loading_location_name", `${loc.partner_name || ""} - ${loc.location_name}`);
          }
        }
      }
    }
  }, [form.orderbook_id, orderbooks]);

  // Auto-fill customs fee from agent
  useEffect(() => {
    if (form.customs_agent_id) {
      const fee = agentFees.find((f) => f.partner_id === form.customs_agent_id && f.status === "active");
      if (fee) set("customs_agent_fee", fee.fee_per_truck);
    }
  }, [form.customs_agent_id]);

  // Auto-fill freight when carrier + sheet line selected
  useEffect(() => {
    if (form.applied_freight_sheet_line_id && freightSheetLines.length > 0) {
      const line = freightSheetLines.find(l => l.id === form.applied_freight_sheet_line_id);
      if (line) {
        set("freight_domestic_leg_snapshot", line.domestic_leg || 0);
        set("freight_foreign_leg_snapshot", line.foreign_leg || 0);
        set("freight_total_snapshot", line.total_price || 0);
        set("freight_eur_per_ton_snapshot", line.eur_per_ton || 0);
        set("freight_load_tons_snapshot", line.load_tons || 0);
        // Also fill destination city from sheet line
        if (line.destination_city) set("destination_city", line.destination_city);
        if (line.destination_zip) set("destination_zip", line.destination_zip);
        if (line.destination_county) set("destination_county", line.destination_county);
        if (line.destination_region) set("destination_region", line.destination_region);
      }
    }
  }, [form.applied_freight_sheet_line_id, freightSheetLines]);

  // Filter freight sheets by carrier + destination country
  const filteredSheets = freightSheets.filter(s =>
    (!form.carrier_id || s.carrier_id === form.carrier_id) &&
    (!form.destination_country || s.destination_country === form.destination_country)
  );

  // Category IDs allowed from orderbook
  const allowedCategoryIds = orderbookLines.map(l => l.category_id);
  // Products filtered to allowed categories
  const allowedProducts = form.orderbook_id
    ? products.filter(p => allowedCategoryIds.includes(p.category_id) && p.status === "active")
    : products.filter(p => p.status === "active");

  const selectedOrderbook = orderbooks.find(o => o.id === form.orderbook_id);

  const handleSave = async () => {
    setSaving(true);
    const data = {
      ...form,
      loading_date: form.expected_loading_date || form.loading_date,
      planned_quantity_tons: Number(form.planned_quantity_tons) || 0,
      actual_weight_tons: Number(form.actual_weight_tons) || 0,
      freight_domestic_leg_snapshot: Number(form.freight_domestic_leg_snapshot) || 0,
      freight_foreign_leg_snapshot: Number(form.freight_foreign_leg_snapshot) || 0,
      freight_total_snapshot: Number(form.freight_total_snapshot) || 0,
      freight_eur_per_ton_snapshot: Number(form.freight_eur_per_ton_snapshot) || 0,
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

  const inp = "bg-white border-[#c6ccda] text-slate-800";
  const lbl = "text-slate-600 text-xs font-semibold";

  return (
    <div className="bg-[#f5f7fa] border border-[rgba(46,58,90,0.12)] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">
          {item ? `Fuvar szerkesztése – ${item.truck_number || item.id?.slice(0, 8)}` : "Új fuvar előjegyzése"}
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-slate-200/60">
          <TabsTrigger value="order" className="gap-1.5 text-xs"><Package className="w-3.5 h-3.5" /> Rendelés & Áru</TabsTrigger>
          <TabsTrigger value="carrier" className="gap-1.5 text-xs"><Truck className="w-3.5 h-3.5" /> Fuvarozó & Fuvardíj</TabsTrigger>
          <TabsTrigger value="destination" className="gap-1.5 text-xs"><MapPin className="w-3.5 h-3.5" /> Célállomás</TabsTrigger>
          <TabsTrigger value="customs" className="gap-1.5 text-xs"><ShieldCheck className="w-3.5 h-3.5" /> Vám & Pénzügy</TabsTrigger>
        </TabsList>

        {/* TAB 1: Order & Goods */}
        <TabsContent value="order" className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-3">
              <Label className={lbl}>Bész. rendelésszám *</Label>
              <Select value={form.orderbook_id} onValueChange={(v) => {
                const o = orderbooks.find(o => o.id === v);
                set("orderbook_id", v);
                set("orderbook_no", o?.order_no || "");
                // Reset product when orderbook changes
                set("product_id", "");
                set("product_name", "");
                // Auto-fill customs agent from orderbook
                if (o && o.customs_required && o.customs_agent_id) {
                  set("customs_agent_id", o.customs_agent_id);
                  set("customs_agent_name", o.customs_agent_name || "");
                  if (o.customs_fee_eur_per_truck) {
                    set("customs_agent_fee", o.customs_fee_eur_per_truck);
                  }
                }
              }}>
                <SelectTrigger className={inp}>
                  <SelectValue placeholder="Válassz nyitott rendelést..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#c6ccda]">
                  {orderbooks.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.supplier_order_no ? `${o.supplier_order_no} (${o.order_no})` : o.order_no} – {o.supplier_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedOrderbook && (
                <div className="mt-1.5 p-2 bg-blue-50 rounded text-xs text-blue-800 space-y-0.5">
                  <div><span className="font-semibold">Incoterms:</span> {selectedOrderbook.incoterms_type} {selectedOrderbook.incoterms_place}</div>
                  {selectedOrderbook.customs_required && <div className="text-orange-700 font-semibold">⚠ Vámkezelés szükséges</div>}
                  {orderbookLines.length > 0 && (
                    <div><span className="font-semibold">Termékkörök:</span> {orderbookLines.map(l => l.category_name).join(", ")}</div>
                  )}
                </div>
              )}
            </div>

            <div className="sm:col-span-2 lg:col-span-2">
              <Label className={lbl}>Termék *</Label>
              <Select value={form.product_id} onValueChange={(v) => {
                const p = products.find(p => p.id === v);
                const cat = categories.find(c => c.id === p?.category_id);
                set("product_id", v);
                set("product_name", [cat?.name_en || cat?.name_hu, p?.diameter ? `Ø${p.diameter}` : "", p?.factory_code || ""].filter(Boolean).join(" "));
                set("hs_code", p?.hs_code || "");
                // Auto-fill price from orderbook line matching the product's category
                if (form.orderbook_id) {
                  const matchLine = orderbookLines.find(l => l.category_id === p?.category_id);
                  if (matchLine?.unit_price_eur_per_ton) set("purchase_price", matchLine.unit_price_eur_per_ton);
                }
              }}>
                <SelectTrigger className={inp}>
                  <SelectValue placeholder={form.orderbook_id ? "Válassz terméket a rendelésből..." : "Válassz rendelést először"} />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#c6ccda]">
                  {allowedProducts.map((p) => {
                    const cat = categories.find(c => c.id === p.category_id);
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        {cat?.name_en || cat?.name_hu} {p.diameter ? `Ø${p.diameter}` : ""} {p.factory_code || ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className={lbl}>HS Kód</Label>
              <Input className={inp} value={form.hs_code} onChange={(e) => set("hs_code", e.target.value)} placeholder="Auto-kitöltés termékből" />
            </div>

            <div>
              <Label className={lbl}>Tervezett mennyiség (t) *</Label>
              <Input type="number" className={inp} value={form.planned_quantity_tons} onChange={(e) => set("planned_quantity_tons", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Tényleges súly (t)</Label>
              <Input type="number" className={inp} value={form.actual_weight_tons} onChange={(e) => set("actual_weight_tons", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Vételár / tonna</Label>
              <Input type="number" className={inp} value={form.purchase_price} onChange={(e) => set("purchase_price", e.target.value)} />
            </div>

            <div>
              <Label className={lbl}>Tervezett rakodási dátum *</Label>
              <Input type="date" className={inp} value={form.expected_loading_date} onChange={(e) => set("expected_loading_date", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Tényleges rakodási dátum</Label>
              <Input type="date" className={inp} value={form.actual_loading_date} onChange={(e) => set("actual_loading_date", e.target.value)} />
            </div>

            <div>
              <Label className={lbl}>Rendszám (Truck #)</Label>
              <Input className={inp} value={form.truck_number} onChange={(e) => set("truck_number", e.target.value)} placeholder="Pl. ABC-123 (kitölthető később)" />
            </div>

            <div>
              <Label className={lbl}>Rakodási helyszín</Label>
              <Select value={form.loading_location_id} onValueChange={(v) => {
                const l = locations.find(l => l.id === v);
                set("loading_location_id", v);
                set("loading_location_name", l ? `${l.partner_name} - ${l.location_name}` : "");
              }}>
                <SelectTrigger className={inp}><SelectValue placeholder="Válassz..." /></SelectTrigger>
                <SelectContent className="bg-white border-[#c6ccda]">
                  {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.partner_name} - {l.location_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Label className={lbl}>Státusz</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white border-[#c6ccda]">
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: Carrier & Freight */}
        <TabsContent value="carrier" className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-2">
              <Label className={lbl}>Fuvarozó *</Label>
              <Select value={form.carrier_id} onValueChange={(v) => {
                const c = carriers.find(c => c.id === v);
                set("carrier_id", v);
                set("carrier_name", c?.name || "");
                // Reset sheet when carrier changes
                set("applied_freight_sheet_id", "");
                set("applied_freight_sheet_line_id", "");
              }}>
                <SelectTrigger className={inp}><SelectValue placeholder="Válassz fuvarozót..." /></SelectTrigger>
                <SelectContent className="bg-white border-[#c6ccda]">
                  {carriers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className={lbl}>Célország *</Label>
              <Select value={form.destination_country} onValueChange={(v) => {
                set("destination_country", v);
                set("applied_freight_sheet_id", "");
                set("applied_freight_sheet_line_id", "");
              }}>
                <SelectTrigger className={inp}><SelectValue placeholder="Ország..." /></SelectTrigger>
                <SelectContent className="bg-white border-[#c6ccda]">
                  {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Freight sheet selection */}
            {form.carrier_id && form.destination_country && (
              <>
                <div className="sm:col-span-2">
                  <Label className={lbl}>Fuvardíj tábla</Label>
                  <Select value={form.applied_freight_sheet_id} onValueChange={(v) => {
                    set("applied_freight_sheet_id", v);
                    set("applied_freight_sheet_line_id", "");
                  }}>
                    <SelectTrigger className={inp}><SelectValue placeholder="Válassz fuvardíj táblát..." /></SelectTrigger>
                    <SelectContent className="bg-white border-[#c6ccda]">
                      {filteredSheets.length === 0
                        ? <SelectItem value="_none" disabled>Nincs találat erre a fuvarozóra/országra</SelectItem>
                        : filteredSheets.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.sheet_number || s.id?.slice(0, 8)} – {s.carrier_name} – {s.destination_country} (érvényes: {s.valid_from})
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>

                {form.applied_freight_sheet_id && (
                  <div className="sm:col-span-2">
                    <Label className={lbl}>Desztináció a fuvardíj táblából</Label>
                    <Select value={form.applied_freight_sheet_line_id} onValueChange={(v) => set("applied_freight_sheet_line_id", v)}>
                      <SelectTrigger className={inp}><SelectValue placeholder="Válassz célvárost..." /></SelectTrigger>
                      <SelectContent className="bg-white border-[#c6ccda]">
                        {freightSheetLines.map(l => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.destination_zip ? `${l.destination_zip} ` : ""}{l.destination_city} {l.destination_county ? `(${l.destination_county})` : ""} — {l.total_price} EUR ({l.eur_per_ton} EUR/t)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <div>
              <Label className={lbl}>Belföldi fuvardíj (EUR)</Label>
              <Input type="number" className={inp} value={form.freight_domestic_leg_snapshot} onChange={(e) => set("freight_domestic_leg_snapshot", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Külföldi fuvardíj (EUR)</Label>
              <Input type="number" className={inp} value={form.freight_foreign_leg_snapshot} onChange={(e) => set("freight_foreign_leg_snapshot", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Összes fuvardíj (EUR)</Label>
              <Input type="number" className={`${inp} font-semibold`} value={form.freight_total_snapshot}
                onChange={(e) => set("freight_total_snapshot", e.target.value)}
                readOnly={!!form.applied_freight_sheet_line_id}
              />
            </div>
            <div>
              <Label className={lbl}>Fuvardíj (EUR/t)</Label>
              <Input type="number" className={inp} value={form.freight_eur_per_ton_snapshot} onChange={(e) => set("freight_eur_per_ton_snapshot", e.target.value)} readOnly={!!form.applied_freight_sheet_line_id} />
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: Destination */}
        <TabsContent value="destination" className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className={lbl}>Célország</Label>
              <Select value={form.destination_country} onValueChange={(v) => set("destination_country", v)}>
                <SelectTrigger className={inp}><SelectValue placeholder="Ország..." /></SelectTrigger>
                <SelectContent className="bg-white border-[#c6ccda]">
                  {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={lbl}>Célváros</Label>
              <Input className={inp} value={form.destination_city} onChange={(e) => set("destination_city", e.target.value)} placeholder="Auto-kitöltés fuvardíj sorból" />
            </div>
            <div>
              <Label className={lbl}>Irányítószám</Label>
              <Input className={inp} value={form.destination_zip || ""} onChange={(e) => set("destination_zip", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Megye / County</Label>
              <Input className={inp} value={form.destination_county || ""} onChange={(e) => set("destination_county", e.target.value)} placeholder="Auto-kitöltés fuvardíj sorból" />
            </div>
            <div>
              <Label className={lbl}>Régió</Label>
              <Input className={inp} value={form.destination_region || ""} onChange={(e) => set("destination_region", e.target.value)} />
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: Customs & Finance */}
        <TabsContent value="customs" className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Label className={lbl}>Vámügynök</Label>
              <Select value={form.customs_agent_id} onValueChange={(v) => {
                const a = customsAgents.find(a => a.id === v);
                set("customs_agent_id", v);
                set("customs_agent_name", a?.name || "");
              }}>
                <SelectTrigger className={inp}><SelectValue placeholder="Válassz vámügynököt..." /></SelectTrigger>
                <SelectContent className="bg-white border-[#c6ccda]">
                  {customsAgents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={lbl}>Vámügynöki díj (EUR)</Label>
              <Input type="number" className={inp} value={form.customs_agent_fee} onChange={(e) => set("customs_agent_fee", e.target.value)} placeholder="Auto-kitöltés" />
            </div>
            <div>
              <Label className={lbl}>MRN szám</Label>
              <Input className={inp} value={form.mrn_number || ""} onChange={(e) => set("mrn_number", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Freight Invoice #</Label>
              <Input className={inp} value={form.freight_invoice_number || ""} onChange={(e) => set("freight_invoice_number", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Árfolyam (HUF/EUR)</Label>
              <Input type="number" className={inp} value={form.exchange_rate || ""} onChange={(e) => set("exchange_rate", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Áru értéke</Label>
              <Input type="number" className={inp} value={form.goods_value || ""} onChange={(e) => set("goods_value", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Vámérték (számított)</Label>
              <Input type="number" className={inp} value={form.calculated_customs_value || ""} onChange={(e) => set("calculated_customs_value", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>ÁFA (számított)</Label>
              <Input type="number" className={inp} value={form.calculated_vat || ""} onChange={(e) => set("calculated_vat", e.target.value)} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between pt-2 border-t border-slate-200">
        <div>{item?.id && <Button variant="ghost" onClick={handleDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2"><Trash2 className="w-4 h-4" /> Törlés</Button>}</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="border-[#c6ccda] text-slate-600">Mégsem</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}
          </Button>
        </div>
      </div>
    </div>
  );
}
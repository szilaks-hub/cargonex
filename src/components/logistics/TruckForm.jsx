import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Save, Trash2, Package, Truck, MapPin, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import TruckItemsEditor from "./TruckItemsEditor";

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
  const [form, setForm] = useState(() => {
    if (item) return { ...item, items: item.items || [] };
    return {
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
      status: "booked",
      items: [],
    };
  });
  const [saving, setSaving] = useState(false);

  const { data: partners = [] } = useQuery({ queryKey: ["partners"], queryFn: () => base44.entities.Partner.list() });
  const { data: locations = [] } = useQuery({ queryKey: ["allLocations"], queryFn: () => base44.entities.PartnerLocation.list() });
  const { data: orderbooks = [] } = useQuery({ queryKey: ["orderbooks-list"], queryFn: () => base44.entities.Orderbook.filter({ status: "open" }) });
  // Fetch ALL orderbook lines to calculate capacity for all orderbooks
  const { data: orderbookLines = [] } = useQuery({
    queryKey: ["all-orderbook-lines"],
    queryFn: () => base44.entities.OrderbookLine.list(),
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
  
  // Fetch ALL trucks to calculate real-time allocation across all orderbooks
  const { data: existingTrucks = [] } = useQuery({
    queryKey: ["all-trucks-for-capacity"],
    queryFn: () => base44.entities.Truck.list(),
    refetchInterval: 2000, // Refetch every 2 seconds for real-time capacity updates
  });

  const carriers = partners.filter((p) => (p.roles || []).includes("carrier"));
  const customsAgents = partners.filter((p) => (p.roles || []).includes("customs_agent"));

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Auto-fill from orderbook: customs agent + preferred carrier + destination country
  useEffect(() => {
    if (form.orderbook_id && orderbooks.length > 0) {
      const ob = orderbooks.find(o => o.id === form.orderbook_id);
      if (!ob) return;
      const updates = {};
      // Auto-fill customs agent
      if (ob.customs_required && ob.customs_agent_id && !form.customs_agent_id) {
        updates.customs_agent_id = ob.customs_agent_id;
        updates.customs_agent_name = ob.customs_agent_name || "";
        if (ob.customs_fee_eur_per_truck) updates.customs_agent_fee = ob.customs_fee_eur_per_truck;
      }
      // Auto-fill destination country (use first country from list, or legacy)
      const firstCountry = ob.destination_countries?.[0] || ob.destination_country;
      if (firstCountry && !form.destination_country) {
        updates.destination_country = firstCountry;
      }
      // Auto-fill preferred carrier from carrier_assignments (match by country) or legacy
      if (!form.carrier_id) {
        const targetCountry = updates.destination_country || form.destination_country;
        const assignment = ob.carrier_assignments?.find(a => a.country === targetCountry);
        if (assignment?.carrier_id) {
          updates.carrier_id = assignment.carrier_id;
          updates.carrier_name = assignment.carrier_name || "";
        } else if (ob.preferred_carrier_id) {
          updates.carrier_id = ob.preferred_carrier_id;
          updates.carrier_name = ob.preferred_carrier_name || "";
        }
      }
      if (Object.keys(updates).length > 0) {
        setForm(f => ({ ...f, ...updates }));
      }
    }
  }, [form.orderbook_id, orderbooks]);

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

  // Auto-select freight sheet when carrier + destination country are set and there's exactly one match (or any match)
  useEffect(() => {
    if (!form.carrier_id || !form.destination_country) return;
    if (form.applied_freight_sheet_id) return; // already selected
    if (filteredSheets.length === 1) {
      set("applied_freight_sheet_id", filteredSheets[0].id);
    } else if (filteredSheets.length > 1) {
      // Auto-select the most recent (latest valid_from) one
      const sorted = [...filteredSheets].sort((a, b) => (b.valid_from || "").localeCompare(a.valid_from || ""));
      set("applied_freight_sheet_id", sorted[0].id);
    }
  }, [form.carrier_id, form.destination_country, filteredSheets.length]);

  // Category IDs allowed from selected orderbook
  const allowedCategoryIds = selectedOrderbookLines.map(l => l.category_id);
  // Products filtered to allowed categories
  const allowedProducts = form.orderbook_id
    ? products.filter(p => allowedCategoryIds.includes(p.category_id) && p.status === "active")
    : products.filter(p => p.status === "active");

  // Calculate remaining capacity for each orderbook
  const orderbooksWithCapacity = orderbooks.map(ob => {
    const obLines = orderbookLines.filter(l => l.orderbook_id === ob.id);
    const totalCapacity = obLines.reduce((sum, line) => sum + (line.planned_quantity_tons || 0), 0);
    
    const trucksForOb = existingTrucks.filter(t => t.orderbook_id === ob.id && t.status !== 'cancelled');
    const allocatedTons = trucksForOb.reduce((sum, t) => sum + (parseFloat(t.planned_quantity_tons) || 0), 0);
    
    const remaining = totalCapacity - allocatedTons;
    
    return {
      ...ob,
      _totalCapacity: totalCapacity,
      _allocatedTons: allocatedTons,
      _remainingCapacity: remaining,
    };
  });

  // Filter: only show orderbooks with available capacity (or currently selected one for editing)
  // RELAXED: Allow orderbooks with at least 0.01t remaining OR if it's currently selected
  const availableOrderbooks = orderbooksWithCapacity.filter(ob => 
    ob._remainingCapacity >= 0.01 || ob.id === form.orderbook_id
  );

  const selectedOrderbook = orderbooksWithCapacity.find(o => o.id === form.orderbook_id);

  // Calculate remaining capacity for the SELECTED orderbook
  const selectedOrderbookLines = orderbookLines.filter(l => l.orderbook_id === form.orderbook_id);
  const totalOrderbookCapacity = selectedOrderbookLines.reduce((sum, line) => sum + (line.planned_quantity_tons || 0), 0);
  
  // Sum actual planned tons from existing trucks for THIS orderbook (excluding cancelled)
  const totalAllocatedFromTrucks = existingTrucks
    .filter(t => t.orderbook_id === form.orderbook_id && t.status !== 'cancelled')
    .reduce((sum, t) => sum + (parseFloat(t.planned_quantity_tons) || 0), 0);
  
  // If editing existing truck, exclude its current planned tonnage
  const currentTruckTonnage = item?.id && item.planned_quantity_tons ? parseFloat(item.planned_quantity_tons) : 0;
  const effectiveAllocated = totalAllocatedFromTrucks - currentTruckTonnage;
  
  const remainingCapacity = totalOrderbookCapacity - effectiveAllocated;
  const plannedTons = parseFloat(form.planned_quantity_tons) || 0;
  
  // Estimate trucks needed (assuming 24t average capacity)
  const avgTruckCapacity = 24;
  const estimatedTrucksNeeded = remainingCapacity > 0 ? Math.ceil(remainingCapacity / avgTruckCapacity) : 0;
  
  // Check if planned tons exceed remaining capacity
  const willExceedCapacity = plannedTons > remainingCapacity && plannedTons > 0;

  const handleSave = async () => {
    // Determine the loading date to use
    const finalLoadingDate = form.expected_loading_date || form.actual_loading_date || form.loading_date;
    
    // Validate required fields
    if (!finalLoadingDate) {
      toast.error('⚠️ Tervezett rakodási dátum kötelező!');
      return;
    }

    // Validate capacity before saving (for both new and edited trucks)
    if (form.orderbook_id && willExceedCapacity) {
      toast.error(`⛔ Túllépés! Csak ${remainingCapacity.toFixed(2)} t szabad még ezen a rendelésen. (Próbált hozzáadni: ${plannedTons.toFixed(2)} t)`, {
        duration: 5000,
      });
      return;
    }
    setSaving(true);
    const data = {
      ...form,
      loading_date: finalLoadingDate,
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
                <SelectContent className="bg-white border-[#c6ccda] max-h-72">
                  {availableOrderbooks.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500 text-center">
                      Nincs szabad kapacitású rendelés
                    </div>
                  ) : (
                    availableOrderbooks.map((o, idx) => (
                      <SelectItem key={o.id} value={o.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/80"}>
                        <div className="flex flex-col py-0.5 gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm leading-tight">
                              {o.supplier_order_no || <span className="italic text-slate-400 font-normal">–</span>}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 rounded px-1">{o.order_no}</span>
                            {o.customs_required && <span className="text-[9px] font-bold text-orange-600 bg-orange-50 rounded px-1">VÁM</span>}
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 rounded px-1">
                              {o._remainingCapacity.toFixed(1)}t szabad
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-medium text-slate-600">{o.supplier_name}</span>
                            {o.supplier_site_name && <span>· {o.supplier_site_name}</span>}
                            {o.order_date && <span>· {o.order_date}</span>}
                            {o.incoterms_type && <span className="text-blue-600 font-semibold">{o.incoterms_type}</span>}
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedOrderbook && (
                <div className="mt-1.5 space-y-2">
                  <div className="p-2 bg-blue-50 rounded text-xs text-blue-800 space-y-0.5">
                    <div><span className="font-semibold">Incoterms:</span> {selectedOrderbook.incoterms_type} {selectedOrderbook.incoterms_place}</div>
                    {selectedOrderbook.destination_country && <div><span className="font-semibold">Célország:</span> {selectedOrderbook.destination_country}</div>}
                    {selectedOrderbook.preferred_carrier_name && <div><span className="font-semibold">Fuvarozó:</span> {selectedOrderbook.preferred_carrier_name}</div>}
                    {selectedOrderbook.customs_required && <div className="text-orange-700 font-semibold">⚠ Vámkezelés szükséges</div>}
                  </div>
                  
                  {/* Capacity & Truck Estimation */}
                  <div className={`p-3 rounded-lg border-2 ${willExceedCapacity ? 'bg-red-50 border-red-300' : 'bg-emerald-50 border-emerald-300'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700">📦 Rendelés kapacitás</span>
                      <span className="text-xs font-mono bg-white rounded px-2 py-0.5 border">
                        {effectiveAllocated.toFixed(1)} / {totalOrderbookCapacity.toFixed(1)} t
                      </span>
                    </div>
                    <div className={`text-sm font-bold ${willExceedCapacity ? 'text-red-700' : 'text-emerald-700'}`}>
                      {remainingCapacity > 0 ? (
                        <>Szabad: {remainingCapacity.toFixed(2)} t</>
                      ) : (
                        <>Teljesítve! Nincs szabad kapacitás.</>
                      )}
                    </div>
                    {remainingCapacity > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-600">
                        <div className="flex items-center justify-between">
                          <span>🚛 Becsült fuvarok:</span>
                          <span className="font-bold text-blue-700">{estimatedTrucksNeeded} kamion</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          (24 t/kamion átlag alapján)
                        </div>
                      </div>
                    )}
                    {willExceedCapacity && (
                      <div className="mt-2 pt-2 border-t border-red-200 text-xs font-semibold text-red-700">
                        ⚠️ Figyelem: A tervezett {plannedTons.toFixed(2)} t túllépi a szabad kapacitást!
                      </div>
                    )}
                  </div>

                  {selectedOrderbookLines.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedOrderbookLines.map(l => (
                        <span key={l.id} className="bg-white border border-blue-200 rounded px-2 py-0.5 text-[10px] text-blue-800">
                          <span className="font-semibold">{l.category_name}</span>
                          {l.unit_price_eur_per_ton ? ` · ${l.unit_price_eur_per_ton} EUR/t` : ""}
                          {l.planned_quantity_tons ? ` · ${((l.planned_quantity_tons || 0) - (l.allocated_quantity_tons || 0)).toFixed(2)} t hátra` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Multi-product editor */}
            <div className="sm:col-span-2 lg:col-span-3">
              <div className="flex items-center justify-between mb-2">
                <Label className={lbl}>Termékek a kamionon</Label>
                <button
                  type="button"
                  onClick={() => {
                    const newItems = [...(form.items || []), { product_id: "", product_name: "", planned_quantity_tons: "", hs_code: "", purchase_price: "" }];
                    setForm(f => ({ ...f, items: newItems }));
                  }}
                  className="bg-red-500/10 hover:bg-red-500/20 text-blue-600 font-semibold text-xs px-3 py-1.5 rounded-lg border border-red-300/30 transition-all"
                >
                  + Termék hozzáadása
                </button>
              </div>
              <TruckItemsEditor
                items={form.items || []}
                allowedProducts={allowedProducts}
                categories={categories}
                orderbookLines={orderbookLines}
                onChange={(newItems) => {
                  // Sync total planned tons and primary product fields from items
                  const total = newItems.reduce((s, i) => s + (parseFloat(i.planned_quantity_tons) || 0), 0);
                  const first = newItems[0];
                  setForm(f => ({
                    ...f,
                    items: newItems,
                    planned_quantity_tons: total || f.planned_quantity_tons,
                    product_id: first?.product_id || f.product_id,
                    product_name: newItems.map(i => i.product_name).filter(Boolean).join(", ") || f.product_name,
                    hs_code: first?.hs_code || f.hs_code,
                    purchase_price: first?.purchase_price || f.purchase_price,
                  }));
                }}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 bg-slate-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className={lbl}>Összes tervezett súly (t)</Label>
                  <Input 
                    type="number" 
                    className={`${inp} font-bold text-lg ${willExceedCapacity ? 'border-red-500 border-2' : 'bg-white'}`} 
                    value={form.planned_quantity_tons} 
                    onChange={(e) => set("planned_quantity_tons", e.target.value)} 
                  />
                  {willExceedCapacity && (
                    <p className="text-xs text-red-600 font-semibold mt-1">
                      ⚠️ Túllépés! Max {remainingCapacity.toFixed(2)} t szabad
                    </p>
                  )}
                </div>
                <div>
                  <Label className={lbl}>Tervezett rakodási dátum *</Label>
                  <Input type="date" className={`${inp} bg-white`} value={form.expected_loading_date} onChange={(e) => set("expected_loading_date", e.target.value)} />
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-3 border-2 border-slate-200">
                <Label className={`${lbl} mb-2 block`}>Rendszám (Truck #)</Label>
                <Input className={`${inp} text-center font-bold text-lg`} value={form.truck_number} onChange={(e) => set("truck_number", e.target.value)} placeholder="ABC-123" />
              </div>

              <div className="border-t-2 border-slate-200 pt-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className={lbl}>Tényleges súly (t)</Label>
                    <Input type="number" className={`${inp} bg-white`} value={form.actual_weight_tons} onChange={(e) => set("actual_weight_tons", e.target.value)} />
                  </div>
                  <div>
                    <Label className={lbl}>Tényleges rakodási dátum</Label>
                    <Input type="date" className={`${inp} bg-white`} value={form.actual_loading_date} onChange={(e) => set("actual_loading_date", e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label className={lbl}>Státusz</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className={`h-11 text-base font-semibold rounded-lg ${
                  form.status === "booked" ? "bg-slate-100 text-slate-700 border-slate-300" :
                  form.status === "loaded" ? "bg-orange-100 text-orange-700 border-orange-300" :
                  "bg-white text-slate-700 border-slate-300"
                }`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-300 rounded-lg">
                  <SelectItem value="booked" className="text-base font-medium hover:bg-slate-100">Előjegyzett</SelectItem>
                  <SelectItem value="loaded" className="text-base font-medium hover:bg-orange-100">Megrakott</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="transit_checkbox"
                checked={form.transit || false}
                onChange={(e) => set("transit", e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <label htmlFor="transit_checkbox" className={`${lbl} cursor-pointer`}>TR (Tranzit)</label>
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
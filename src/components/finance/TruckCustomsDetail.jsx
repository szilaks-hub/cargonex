import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Lock, Save, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { toast } from "sonner";

export default function TruckCustomsDetail({ truck, onBack, onUpdated }) {
  const [form, setForm] = useState({
    ekaer: truck.ekaer || false,
    hs_code_verified: truck.hs_code_verified || false,
    invoice_checked: truck.invoice_checked || false,
    checklist_notes: truck.checklist_notes || "",
    supplier_invoice_number: truck.supplier_invoice_number || "",
    freight_invoice_number: truck.freight_invoice_number || "",
    mrn_number: truck.mrn_number || "",
    mrn_date: truck.mrn_date || "",
    mrn_declared_amount: truck.mrn_declared_amount || "",
    declared_vat: truck.declared_vat || "",
    exchange_rate: truck.exchange_rate || "",
    actual_weight_tons: truck.actual_weight_tons || "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // --- Calculations ---
  const exchangeRate = Number(form.exchange_rate) || 0;
  const actualWeight = Number(form.actual_weight_tons) || 0;
  const purchasePrice = truck.purchase_price || truck.avg_price || 0;

  // EUR values from freight snapshot or direct fields
  const foreignFreightEur = truck.freight_foreign_leg_snapshot || truck.foreign_freight || 0;
  const domesticFreightEur = truck.freight_domestic_leg_snapshot || truck.domestic_freight || 0;
  const customsAgentFeeEur = truck.customs_agent_fee || 0;

  // FCA invoice value = actual weight * purchase price (EUR)
  const invoiceEur = actualWeight * purchasePrice;
  // HUF conversions
  const invoiceHuf = invoiceEur * exchangeRate;
  const foreignFreightHuf = foreignFreightEur * exchangeRate;
  const domesticFreightHuf = domesticFreightEur * exchangeRate;
  const customsAgentFeeHuf = customsAgentFeeEur * exchangeRate;

  const totalBase = invoiceHuf + foreignFreightHuf + domesticFreightHuf + customsAgentFeeHuf;
  // Tájékoztató ÁFA = végösszeg * 27%
  const indicativeVat = totalBase * 0.27;

  // MRN comparison
  const mrnDeclared = Number(form.mrn_declared_amount) || 0;
  let mrnStatus = "none"; // none | match | warn | error
  if (mrnDeclared > 0 && indicativeVat > 0) {
    const diff = Math.abs(indicativeVat - mrnDeclared) / indicativeVat * 100;
    if (diff <= 0.5) mrnStatus = "match";
    else if (diff <= 1) mrnStatus = "warn";
    else mrnStatus = "error";
  }

  const mrnStatusConfig = {
    none: { color: "bg-slate-50 border-slate-200", text: "" },
    match: { color: "bg-green-50 border-green-300 text-green-700", icon: <CheckCircle2 className="w-4 h-4 text-green-600" />, text: "Egyezik ✓" },
    warn: { color: "bg-orange-50 border-orange-300 text-orange-700", icon: <AlertCircle className="w-4 h-4 text-orange-500" />, text: "Eltérés ≤1% – figyelmeztetés" },
    error: { color: "bg-red-50 border-red-300 text-red-700", icon: <XCircle className="w-4 h-4 text-red-500" />, text: "Eltérés >1% – ellenőrzés szükséges!" },
  };

  const isClosed = truck.status === "closed";

  // Can close: supplier invoice + freight invoice + mrn + exchange rate must be filled
  const canClose = form.supplier_invoice_number?.trim() && form.freight_invoice_number?.trim() && form.mrn_number?.trim() && exchangeRate > 0;

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Truck.update(truck.id, {
      supplier_invoice_number: form.supplier_invoice_number,
      ...form,
      actual_weight_tons: Number(form.actual_weight_tons) || 0,
      declared_vat: Number(form.declared_vat) || 0,
      exchange_rate: Number(form.exchange_rate) || 0,
      mrn_declared_amount: Number(form.mrn_declared_amount) || 0,
      calculated_customs_value: totalBase,
      calculated_vat: indicativeVat,
      goods_value: invoiceHuf,
      total_base: totalBase,
    });
    setSaving(false);
    toast.success("Mentve");
    onUpdated();
  };

  const handleClose = async () => {
    if (!canClose) {
      toast.error("A lezáráshoz szükséges: Freight Invoice #, MRN szám és árfolyam.");
      return;
    }
    await base44.entities.Truck.update(truck.id, {
      ...form,
      actual_weight_tons: Number(form.actual_weight_tons) || 0,
      declared_vat: Number(form.declared_vat) || 0,
      exchange_rate: Number(form.exchange_rate) || 0,
      mrn_declared_amount: Number(form.mrn_declared_amount) || 0,
      calculated_customs_value: totalBase,
      calculated_vat: indicativeVat,
      goods_value: invoiceHuf,
      total_base: totalBase,
      status: "closed",
      closed_date: new Date().toISOString().split("T")[0],
    });
    toast.success("Lezárva és rögzítve");
    onUpdated();
  };

  const fmt = (n, decimals = 0) =>
    n ? n.toLocaleString("hu-HU", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : "0";

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack} className="text-slate-500 hover:text-slate-800 p-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {truck.truck_number || `T-${truck.id?.slice(0, 6)}`}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-slate-500">{truck.product_name}</span>
            <StatusBadge status={truck.status} />
          </div>
        </div>
      </div>

      {/* === FELADÓ / RAKODÁSI ADATOK === */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Feladó / Rakodási adatok</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-400">Fuvarozó</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{truck.carrier_name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Rakodási hely</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{truck.loading_location_name || truck.origin_location_name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Vámügynök</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{truck.customs_agent_name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Célállomás</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">
              {[truck.destination_country, truck.destination_zip, truck.destination_city].filter(Boolean).join(" ")}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Vételár (EUR/t)</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{purchasePrice ? `${purchasePrice} EUR/t` : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Külföldi fuvar (EUR)</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{foreignFreightEur ? `${foreignFreightEur} EUR` : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Belföldi fuvar (EUR)</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{domesticFreightEur ? `${domesticFreightEur} EUR` : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Vámügynöki díj (EUR)</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{customsAgentFeeEur ? `${customsAgentFeeEur} EUR` : "—"}</p>
          </div>
        </div>
      </div>

      {/* Checklist & Customs Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Checklist */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Checklist / Ellenőrzőlista</h3>
          <div className="space-y-3">
            {[
              { key: "ekaer", label: "EKAER" },
              { key: "hs_code_verified", label: "HS Code Correct / VTSZ helyes" },
              { key: "invoice_checked", label: "Invoice Checked / Számla ellenőrizve" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <Checkbox checked={form[key]} onCheckedChange={(v) => set(key, v)} disabled={isClosed} />
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            ))}
          </div>
          <div>
            <Label className="text-slate-500 text-xs">Notes / Megjegyzés</Label>
            <Textarea className="h-20 mt-1 bg-slate-50" value={form.checklist_notes} onChange={(e) => set("checklist_notes", e.target.value)} disabled={isClosed} />
          </div>
        </div>

        {/* Customs Data */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vámadatok / Customs Data</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-500 text-xs">Tény. súly (t)</Label>
              <Input type="number" className="mt-1 bg-slate-50" value={form.actual_weight_tons} onChange={(e) => set("actual_weight_tons", e.target.value)} disabled={isClosed} />
            </div>
            <div>
              <Label className="text-slate-500 text-xs">Árfolyam (EUR→HUF) *</Label>
              <Input type="number" step="0.01" className="mt-1 bg-slate-50" placeholder="pl. 400" value={form.exchange_rate} onChange={(e) => set("exchange_rate", e.target.value)} disabled={isClosed} />
            </div>
            <div>
              <Label className="text-slate-500 text-xs">Eladó számlaszáma *</Label>
              <Input className={`mt-1 ${!form.supplier_invoice_number && !isClosed ? "border-orange-300 bg-orange-50" : "bg-slate-50"}`} value={form.supplier_invoice_number} onChange={(e) => set("supplier_invoice_number", e.target.value)} disabled={isClosed} placeholder="pl. INV-2024-001" />
            </div>
            <div>
              <Label className="text-slate-500 text-xs">Fuvar számla (Freight Invoice #) *</Label>
              <Input className={`mt-1 ${!form.freight_invoice_number && !isClosed ? "border-orange-300 bg-orange-50" : "bg-slate-50"}`} value={form.freight_invoice_number} onChange={(e) => set("freight_invoice_number", e.target.value)} disabled={isClosed} />
            </div>
            <div>
              <Label className="text-slate-500 text-xs">MRN szám *</Label>
              <Input className={`mt-1 ${!form.mrn_number && !isClosed ? "border-orange-300 bg-orange-50" : "bg-slate-50"}`} value={form.mrn_number} onChange={(e) => set("mrn_number", e.target.value)} disabled={isClosed} />
            </div>
            <div>
              <Label className="text-slate-500 text-xs">MRN dátum</Label>
              <Input type="date" className="mt-1 bg-slate-50" value={form.mrn_date} onChange={(e) => set("mrn_date", e.target.value)} disabled={isClosed} />
            </div>
            <div>
              <Label className="text-slate-500 text-xs">MRN megállapított összeg (HUF)</Label>
              <Input type="number" className={`mt-1 border-2 ${mrnStatusConfig[mrnStatus]?.color || "bg-slate-50"}`} value={form.mrn_declared_amount} onChange={(e) => set("mrn_declared_amount", e.target.value)} disabled={isClosed} placeholder="kézi bevitel" />
              {mrnStatus !== "none" && (
                <div className={`flex items-center gap-1.5 mt-1 text-xs px-2 py-1 rounded-md border ${mrnStatusConfig[mrnStatus].color}`}>
                  {mrnStatusConfig[mrnStatus].icon}
                  <span>{mrnStatusConfig[mrnStatus].text}</span>
                  {mrnStatus !== "match" && (
                    <span className="ml-auto font-mono">
                      Számított: {fmt(indicativeVat)} | MRN: {fmt(mrnDeclared)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* === KALKULÁCIÓ === */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Kalkuláció / Calculation</h3>
        <div className="space-y-2 text-sm">
          {/* Invoice line */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <span className="font-medium text-slate-700">Számla összege (FCA)</span>
              <span className="text-slate-400 ml-2 text-xs">
                {actualWeight} t × {purchasePrice} EUR = {fmt(invoiceEur, 2)} EUR
              </span>
            </div>
            <div className="text-right">
              <div className="font-bold text-slate-800">{fmt(invoiceHuf, 0)} HUF</div>
              {exchangeRate > 0 && <div className="text-xs text-slate-400">× {exchangeRate} = {fmt(invoiceHuf, 0)}</div>}
            </div>
          </div>

          {/* Freight lines */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <span className="font-medium text-slate-700">Fuvar – külföldi szakasz</span>
              <span className="text-slate-400 ml-2 text-xs">{foreignFreightEur} EUR × {exchangeRate || "?"}</span>
            </div>
            <div className="font-semibold text-slate-700">{fmt(foreignFreightHuf, 0)} HUF</div>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <span className="font-medium text-slate-700">Fuvar – belföldi szakasz</span>
              <span className="text-slate-400 ml-2 text-xs">{domesticFreightEur} EUR × {exchangeRate || "?"}</span>
            </div>
            <div className="font-semibold text-slate-700">{fmt(domesticFreightHuf, 0)} HUF</div>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <span className="font-medium text-slate-700">Vám (vámügynöki díj)</span>
              <span className="text-slate-400 ml-2 text-xs">{customsAgentFeeEur} EUR × {exchangeRate || "?"}</span>
            </div>
            <div className="font-semibold text-slate-700">{fmt(customsAgentFeeHuf, 0)} HUF</div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between py-3 bg-slate-50 rounded-lg px-3 mt-2">
            <span className="font-bold text-slate-800 text-base">Végösszeg / Total Base</span>
            <span className="font-bold text-blue-700 text-lg">{fmt(totalBase, 0)} HUF</span>
          </div>

          {/* Indicative VAT */}
          <div className={`flex items-center justify-between py-3 rounded-lg px-3 border-2 ${mrnStatus === "match" ? "bg-green-50 border-green-300" : mrnStatus === "warn" ? "bg-orange-50 border-orange-300" : mrnStatus === "error" ? "bg-red-50 border-red-300" : "bg-amber-50 border-amber-200"}`}>
            <div>
              <span className="font-bold text-slate-700 text-base">Tájékoztató ÁFA (total × 27%)</span>
              <span className="text-slate-400 text-xs ml-2">{fmt(totalBase, 0)} × 27%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-orange-600 text-lg">{fmt(indicativeVat, 0)} HUF</span>
              {mrnStatus === "match" && <CheckCircle2 className="w-6 h-6 text-green-500" />}
              {mrnStatus === "warn" && <AlertCircle className="w-6 h-6 text-orange-500" />}
              {mrnStatus === "error" && <XCircle className="w-6 h-6 text-red-500" />}
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {!isClosed && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {!canClose && (
            <p className="text-xs text-orange-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Lezáráshoz szükséges: Freight Invoice #, MRN szám, árfolyam
            </p>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" /> Mentés
            </Button>
            <Button
              onClick={handleClose}
              disabled={!canClose || saving}
              className={`gap-2 ${canClose ? "bg-green-600 hover:bg-green-700 text-white" : "opacity-50 cursor-not-allowed"}`}
            >
              <Lock className="w-4 h-4" /> Lezárás & Véglegesítés
            </Button>
          </div>
        </div>
      )}
      {isClosed && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">Ez a fuvar le van zárva és véglegesítve.</span>
        </div>
      )}
    </div>
  );
}
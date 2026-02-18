import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Lock, AlertTriangle, Save } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";

export default function TruckCustomsDetail({ truck, onBack, onUpdated }) {
  const [form, setForm] = useState({
    ekaer: truck.ekaer || false,
    hs_code_verified: truck.hs_code_verified || false,
    invoice_checked: truck.invoice_checked || false,
    checklist_notes: truck.checklist_notes || "",
    freight_invoice_number: truck.freight_invoice_number || "",
    mrn_number: truck.mrn_number || "",
    declared_vat: truck.declared_vat || "",
    exchange_rate: truck.exchange_rate || "",
    actual_weight_tons: truck.actual_weight_tons || "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const exchangeRate = Number(form.exchange_rate) || 1;
  const actualWeight = Number(form.actual_weight_tons) || 0;
  const purchasePrice = truck.purchase_price || 0;
  const foreignFreight = (truck.foreign_freight || 0) * exchangeRate;
  const domesticFreight = (truck.domestic_freight || 0) * exchangeRate;
  const customsAgentFee = (truck.customs_agent_fee || 0) * exchangeRate;
  const goodsValue = actualWeight * purchasePrice * exchangeRate;
  const totalBase = goodsValue + foreignFreight + domesticFreight + customsAgentFee;
  const indicativeVat = totalBase * 0.27;
  const declaredVat = Number(form.declared_vat) || 0;
  const vatDiff = Math.abs(indicativeVat - declaredVat);
  const vatMismatch = declaredVat > 0 && vatDiff > 1;
  const isClosed = truck.status === "closed";

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Truck.update(truck.id, {
      ...form,
      actual_weight_tons: Number(form.actual_weight_tons) || 0,
      declared_vat: Number(form.declared_vat) || 0,
      exchange_rate: Number(form.exchange_rate) || 0,
      calculated_customs_value: totalBase,
      calculated_vat: indicativeVat,
      goods_value: goodsValue,
      total_base: totalBase,
    });
    setSaving(false);
    onUpdated();
  };

  const handleClose = async () => {
    await base44.entities.Truck.update(truck.id, {
      ...form,
      actual_weight_tons: Number(form.actual_weight_tons) || 0,
      declared_vat: Number(form.declared_vat) || 0,
      exchange_rate: Number(form.exchange_rate) || 0,
      calculated_customs_value: totalBase,
      calculated_vat: indicativeVat,
      goods_value: goodsValue,
      total_base: totalBase,
      status: "closed",
      closed_date: new Date().toISOString().split("T")[0],
    });
    onUpdated();
  };

  return (
    <div className="space-y-5">
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

      {/* Truck info summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 shadow-sm">
        {[
          { label: "Carrier", value: truck.carrier_name },
          { label: "Purchase Price/t", value: truck.purchase_price },
          { label: "Foreign Freight", value: truck.foreign_freight },
          { label: "Domestic Freight", value: truck.domestic_freight },
          { label: "Customs Agent", value: truck.customs_agent_name },
          { label: "Agent Fee", value: truck.customs_agent_fee },
          { label: "HS Code", value: truck.hs_code },
          { label: "Destination", value: [truck.destination_country, truck.destination_city].filter(Boolean).join(" ") },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs text-slate-400">{label}</p>
            <p className="text-sm font-medium text-slate-700 mt-0.5">{value || "-"}</p>
          </div>
        ))}
      </div>

      {/* Checklist & Data entry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">Checklist / Ellenőrzőlista</h3>
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

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">Customs Data / Vámadatok</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-500 text-xs">Actual Weight (t)</Label>
              <Input type="number" className="mt-1 bg-slate-50" value={form.actual_weight_tons} onChange={(e) => set("actual_weight_tons", e.target.value)} disabled={isClosed} />
            </div>
            <div>
              <Label className="text-slate-500 text-xs">Exchange Rate *</Label>
              <Input type="number" step="0.01" className="mt-1 bg-slate-50" value={form.exchange_rate} onChange={(e) => set("exchange_rate", e.target.value)} disabled={isClosed} />
            </div>
            <div>
              <Label className="text-slate-500 text-xs">Freight Invoice #</Label>
              <Input className="mt-1 bg-slate-50" value={form.freight_invoice_number} onChange={(e) => set("freight_invoice_number", e.target.value)} disabled={isClosed} />
            </div>
            <div>
              <Label className="text-slate-500 text-xs">MRN Number</Label>
              <Input className="mt-1 bg-slate-50" value={form.mrn_number} onChange={(e) => set("mrn_number", e.target.value)} disabled={isClosed} />
            </div>
            <div className="col-span-2">
              <Label className="text-slate-500 text-xs">Declared VAT / Bevallott ÁFA</Label>
              <Input type="number" className="mt-1 bg-slate-50" value={form.declared_vat} onChange={(e) => set("declared_vat", e.target.value)} disabled={isClosed} />
            </div>
          </div>
        </div>
      </div>

      {/* Calculation breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Calculation / Kalkuláció</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-6 text-sm">
          {[
            { label: "Goods Value (t × price × rate)", value: goodsValue },
            { label: "Foreign Freight × Rate", value: foreignFreight },
            { label: "Domestic Freight × Rate", value: domesticFreight },
            { label: "Customs Agent Fee × Rate", value: customsAgentFee },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-slate-500">{label}</span>
              <span className="text-slate-700 font-medium">{value.toLocaleString("hu-HU", { maximumFractionDigits: 2 })}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-100 pt-2 mt-1">
            <span className="font-semibold text-slate-700">Total Base / Alap</span>
            <span className="text-blue-600 font-bold">{totalBase.toLocaleString("hu-HU", { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-2 mt-1">
            <span className="font-semibold text-slate-700">Indicative VAT (27%)</span>
            <span className="text-orange-600 font-bold">{indicativeVat.toLocaleString("hu-HU", { maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {vatMismatch && (
          <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">
              VAT Mismatch! Declared: {declaredVat.toLocaleString()} vs Calculated: {indicativeVat.toLocaleString("hu-HU", { maximumFractionDigits: 2 })} (Diff: {vatDiff.toLocaleString("hu-HU", { maximumFractionDigits: 2 })})
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isClosed && (
        <div className="flex justify-end gap-3">
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save / Mentés"}
          </Button>
          <Button onClick={handleClose} className="bg-red-600 hover:bg-red-700 text-white gap-2 shadow-sm">
            <Lock className="w-4 h-4" /> Close & Lock / Véglegesítés
          </Button>
        </div>
      )}

      {isClosed && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-600" />
          <p className="text-sm text-emerald-700">This truck record is closed and locked. / Ez a kamion rekord lezárt és zárolva van.</p>
        </div>
      )}
    </div>
  );
}
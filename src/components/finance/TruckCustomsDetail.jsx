import React, { useState, useEffect } from "react";
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

  // Calculation
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack} className="text-[#8b949e] hover:text-white p-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-[#e6edf3]">
            {truck.truck_number || `T-${truck.id?.slice(0, 6)}`}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-[#8b949e]">{truck.product_name}</span>
            <StatusBadge status={truck.status} />
          </div>
        </div>
      </div>

      {/* Truck info summary */}
      <div className="bg-[#1a1e23] border border-[#2d333b] rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div><p className="text-xs text-[#8b949e]">Carrier</p><p className="text-sm font-medium text-[#e6edf3] mt-0.5">{truck.carrier_name || "-"}</p></div>
        <div><p className="text-xs text-[#8b949e]">Purchase Price/t</p><p className="text-sm font-medium text-[#e6edf3] mt-0.5">{truck.purchase_price || "-"}</p></div>
        <div><p className="text-xs text-[#8b949e]">Foreign Freight</p><p className="text-sm font-medium text-[#e6edf3] mt-0.5">{truck.foreign_freight || "-"}</p></div>
        <div><p className="text-xs text-[#8b949e]">Domestic Freight</p><p className="text-sm font-medium text-[#e6edf3] mt-0.5">{truck.domestic_freight || "-"}</p></div>
        <div><p className="text-xs text-[#8b949e]">Customs Agent</p><p className="text-sm font-medium text-[#e6edf3] mt-0.5">{truck.customs_agent_name || "-"}</p></div>
        <div><p className="text-xs text-[#8b949e]">Agent Fee</p><p className="text-sm font-medium text-[#e6edf3] mt-0.5">{truck.customs_agent_fee || "-"}</p></div>
        <div><p className="text-xs text-[#8b949e]">HS Code</p><p className="text-sm font-medium text-[#e6edf3] mt-0.5">{truck.hs_code || "-"}</p></div>
        <div><p className="text-xs text-[#8b949e]">Destination</p><p className="text-sm font-medium text-[#e6edf3] mt-0.5">{truck.destination_country} {truck.destination_city}</p></div>
      </div>

      {/* Checklist & Data entry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Checklist */}
        <div className="bg-[#1a1e23] border border-[#2d333b] rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-medium text-[#e6edf3]">Checklist / Ellenőrzőlista</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={form.ekaer} onCheckedChange={(v) => set("ekaer", v)} disabled={isClosed} className="border-[#2d333b]" />
              <span className="text-sm text-[#e6edf3]">EKAER</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={form.hs_code_verified} onCheckedChange={(v) => set("hs_code_verified", v)} disabled={isClosed} className="border-[#2d333b]" />
              <span className="text-sm text-[#e6edf3]">HS Code Correct / VTSZ helyes</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={form.invoice_checked} onCheckedChange={(v) => set("invoice_checked", v)} disabled={isClosed} className="border-[#2d333b]" />
              <span className="text-sm text-[#e6edf3]">Invoice Checked / Számla ellenőrizve</span>
            </label>
          </div>
          <div>
            <Label className="text-[#8b949e] text-xs">Notes / Megjegyzés</Label>
            <Textarea className="bg-[#22272e] border-[#2d333b] text-[#e6edf3] h-20" value={form.checklist_notes} onChange={(e) => set("checklist_notes", e.target.value)} disabled={isClosed} />
          </div>
        </div>

        {/* Data entry */}
        <div className="bg-[#1a1e23] border border-[#2d333b] rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-medium text-[#e6edf3]">Customs Data / Vámadatok</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#8b949e] text-xs">Actual Weight (t)</Label>
              <Input type="number" className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.actual_weight_tons} onChange={(e) => set("actual_weight_tons", e.target.value)} disabled={isClosed} />
            </div>
            <div>
              <Label className="text-[#8b949e] text-xs">Exchange Rate *</Label>
              <Input type="number" step="0.01" className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.exchange_rate} onChange={(e) => set("exchange_rate", e.target.value)} disabled={isClosed} />
            </div>
            <div>
              <Label className="text-[#8b949e] text-xs">Freight Invoice #</Label>
              <Input className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.freight_invoice_number} onChange={(e) => set("freight_invoice_number", e.target.value)} disabled={isClosed} />
            </div>
            <div>
              <Label className="text-[#8b949e] text-xs">MRN Number</Label>
              <Input className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.mrn_number} onChange={(e) => set("mrn_number", e.target.value)} disabled={isClosed} />
            </div>
            <div className="col-span-2">
              <Label className="text-[#8b949e] text-xs">Declared VAT / Bevallott ÁFA</Label>
              <Input type="number" className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.declared_vat} onChange={(e) => set("declared_vat", e.target.value)} disabled={isClosed} />
            </div>
          </div>
        </div>
      </div>

      {/* Calculation breakdown */}
      <div className="bg-[#1a1e23] border border-[#2d333b] rounded-xl p-5">
        <h3 className="text-sm font-medium text-[#e6edf3] mb-4">Calculation / Kalkuláció</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-6 text-sm">
          <div className="flex justify-between">
            <span className="text-[#8b949e]">Domestic Freight × Rate</span>
            <span className="text-[#e6edf3] font-medium">{domesticFreight.toLocaleString("hu-HU", { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8b949e]">Foreign Freight × Rate</span>
            <span className="text-[#e6edf3] font-medium">{foreignFreight.toLocaleString("hu-HU", { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8b949e]">Customs Agent Fee × Rate</span>
            <span className="text-[#e6edf3] font-medium">{customsAgentFee.toLocaleString("hu-HU", { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8b949e]">Goods Value (weight × price × rate)</span>
            <span className="text-[#e6edf3] font-medium">{goodsValue.toLocaleString("hu-HU", { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between border-t border-[#2d333b] pt-2 mt-2">
            <span className="text-[#e6edf3] font-medium">Total Base / Alap</span>
            <span className="text-blue-400 font-bold">{totalBase.toLocaleString("hu-HU", { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between border-t border-[#2d333b] pt-2 mt-2">
            <span className="text-[#e6edf3] font-medium">Indicative VAT (27%)</span>
            <span className="text-orange-400 font-bold">{indicativeVat.toLocaleString("hu-HU", { maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* VAT mismatch warning */}
        {vatMismatch && (
          <div className="mt-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">
              VAT Mismatch! Declared: {declaredVat.toLocaleString()} vs Calculated: {indicativeVat.toLocaleString("hu-HU", { maximumFractionDigits: 2 })}
              (Difference: {vatDiff.toLocaleString("hu-HU", { maximumFractionDigits: 2 })})
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isClosed && (
        <div className="flex justify-end gap-3">
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save / Mentés"}
          </Button>
          <Button onClick={handleClose} className="bg-red-600 hover:bg-red-700 text-white gap-2">
            <Lock className="w-4 h-4" /> Close & Lock / Véglegesítés
          </Button>
        </div>
      )}

      {isClosed && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-green-400" />
          <p className="text-sm text-green-400">This truck record is closed and locked. / Ez a kamion rekord lezárt és zárolva van.</p>
        </div>
      )}
    </div>
  );
}
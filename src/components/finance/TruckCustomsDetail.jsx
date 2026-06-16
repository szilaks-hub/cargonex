import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Lock, Save, CheckCircle2, AlertCircle, XCircle, Printer, Trash2, FileEdit, ArrowRight } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
    amendment_requested: truck.amendment_requested || false,
    amendment_requested_at: truck.amendment_requested_at || null,
    mrn_number_2: truck.mrn_number_2 || "",
    mrn_date_2: truck.mrn_date_2 || "",
    mrn_number_2_locked: truck.mrn_number_2_locked || false,
  });
  const [saving, setSaving] = useState(false);
  const [savingMrn2, setSavingMrn2] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteKey, setDeleteKey] = useState("");
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [reopenKey, setReopenKey] = useState("");
  const [showAmendmentDialog, setShowAmendmentDialog] = useState(false);
  const [amendmentKey, setAmendmentKey] = useState("");
  const [showLockMrn2Dialog, setShowLockMrn2Dialog] = useState(false);
  const [lockMrn2Key, setLockMrn2Key] = useState("");

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

  // Combined totals
  const totalFreightEur = foreignFreightEur + domesticFreightEur;
  const totalFreightHuf = foreignFreightHuf + domesticFreightHuf;
  const domesticAndCustomsEur = domesticFreightEur + customsAgentFeeEur;
  const domesticAndCustomsHuf = domesticFreightHuf + customsAgentFeeHuf;

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

  const handlePrint = () => {
    const today = new Date().toLocaleDateString("hu-HU");
    const win = window.open("", "_blank", "width=960,height=1100");
    win.document.write(`<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8"/>
  <title>Vámkezelési Ellenőrző – ${truck.truck_number || truck.id?.slice(0,6)}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm 16mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 10.5px; color: #0f172a; background: #fff; }
    .toolbar { position: fixed; top: 0; left: 0; right: 0; background: #1e3a8a; color: white; padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; z-index: 999; }
    .toolbar span { font-size: 13px; font-weight: 700; }
    .toolbar button { background: white; color: #1e3a8a; border: none; padding: 7px 20px; border-radius: 5px; font-size: 12px; font-weight: 700; cursor: pointer; }
    @media print { .toolbar { display: none !important; } body { padding-top: 0 !important; } }
    body { padding-top: 52px; }
    .page { max-width: 720px; margin: 20px auto; padding: 28px 32px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; }
    @media print { .page { max-width: 100%; margin: 0; padding: 0; border: none; box-shadow: none; } }
    h1 { font-size: 18px; font-weight: 900; color: #0f172a; }
    h2 { font-size: 11px; font-weight: 800; color: #1e3a8a; border-bottom: 1px solid #dbeafe; padding-bottom: 4px; margin: 16px 0 7px 0; }
    .doc-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e3a8a; padding-bottom: 14px; margin-bottom: 16px; }
    .meta { font-size: 9.5px; color: #475569; margin-top: 6px; }
    .meta span { font-weight: 700; color: #0f172a; display: inline-block; min-width: 120px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin-bottom: 10px; }
    .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px 16px; }
    .field { margin-bottom: 6px; }
    .field .lbl { font-size: 8.5px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
    .field .val { font-size: 10.5px; font-weight: 700; color: #0f172a; }
    table { border-collapse: collapse; width: 100%; font-size: 10px; margin-top: 6px; }
    th { background: #1e3a8a; color: white; padding: 5px 8px; text-align: left; font-size: 9px; }
    td { border: 1px solid #e2e8f0; padding: 4px 8px; }
    tr:nth-child(even) td { background: #f8fafc; }
    tfoot td { background: #1e3a8a; color: white; font-weight: bold; }
    .right { text-align: right; }
    .total-row td { background: #0f172a !important; color: white; font-size: 11px; font-weight: 900; }
    .vat-row td { background: #fef3c7; font-size: 11px; font-weight: 900; }
    .check { font-size: 12px; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; }
    .status-closed { background: #d1fae5; color: #065f46; }
    .status-fc { background: #fef9c3; color: #854d0e; }
    .status-loaded { background: #ffedd5; color: #9a3412; }
    .mrn-compare { display: flex; align-items: center; gap: 10px; background: #fffbeb; border: 1px solid #f59e0b; border-radius: 6px; padding: 8px 12px; margin-top: 6px; }
    .mrn-box { flex: 1; text-align: center; }
    .mrn-box .lbl2 { font-size: 8px; color: #92400e; }
    .mrn-box .val2 { font-size: 11px; font-weight: 900; font-family: monospace; }
    .arrow { color: #f59e0b; font-size: 16px; }
    .footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; font-size: 8px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="toolbar">
    <span>Vámkezelési Ellenőrző – ${truck.truck_number || "—"}</span>
    <button onclick="window.print()">🖨️ Nyomtatás / PDF mentés</button>
  </div>
  <div class="page">
    <div class="doc-header">
      <div>
        <h1>VÁMKEZELÉSI ELLENŐRZŐ ŰRLAP</h1>
        <div class="meta"><span>Rendszám:</span> ${truck.truck_number || "—"}</div>
        <div class="meta"><span>Nyomtatva:</span> ${today}</div>
        <div class="meta"><span>Státusz:</span> <span class="status-badge ${truck.status === "closed" ? "status-closed" : truck.status === "finance_control" ? "status-fc" : "status-loaded"}">${truck.status === "closed" ? "Lezárt" : truck.status === "finance_control" ? "Pénzügyi ellenőrzés" : "Megrakott"}</span></div>
      </div>
    </div>

    <div class="grid2">
      <div>
        <h2>FELADÓ / SHIPPER</h2>
        <div class="field"><div class="lbl">Név</div><div class="val">${truck.supplier_name || "—"}</div></div>
        <div class="field"><div class="lbl">Telephely</div><div class="val">${truck.supplier_site_name || "—"}</div></div>
        <div class="field"><div class="lbl">Ország</div><div class="val">${truck.origin_country || "—"}</div></div>
      </div>
      <div>
        <h2>LOGISZTIKA / LOGISTICS</h2>
        <div class="field"><div class="lbl">Fuvarozó</div><div class="val">${truck.carrier_name || "—"}</div></div>
        <div class="field"><div class="lbl">Vámügynök</div><div class="val">${truck.customs_agent_name || "—"}</div></div>
        <div class="field"><div class="lbl">Célállomás</div><div class="val">${[truck.destination_country, truck.destination_zip, truck.destination_city].filter(Boolean).join(" ") || "—"}</div></div>
        <div class="field"><div class="lbl">Paritás</div><div class="val">${truck.incoterms_type || "FCA"}</div></div>
      </div>
    </div>

    <div class="grid2">
      <div>
        <h2>SZÁMLÁK / INVOICES</h2>
        <div class="field"><div class="lbl">Eladó számla</div><div class="val">${form.supplier_invoice_number || "—"}</div></div>
        <div class="field"><div class="lbl">Fuvar számla</div><div class="val">${form.freight_invoice_number || "—"}</div></div>
      </div>
      <div>
        <h2>JÁRMŰ ADATOK</h2>
        <div class="field"><div class="lbl">Tény. súly</div><div class="val">${actualWeight} t (${(actualWeight * 1000).toFixed(0)} kg)</div></div>
        <div class="field"><div class="lbl">Árfolyam</div><div class="val">${exchangeRate ? exchangeRate + " HUF/EUR" : "—"}</div></div>
        <div class="field"><div class="lbl">Vételár</div><div class="val">${purchasePrice ? purchasePrice + " EUR/t" : "—"}</div></div>
      </div>
    </div>

    <h2>ÁRAK ÉS KÖLTSÉGEK / PRICES & COSTS</h2>
    <table>
      <thead><tr><th>Tétel</th><th class="right">EUR</th><th class="right">HUF</th></tr></thead>
      <tbody>
        <tr><td>Számla összege (${truck.incoterms_type || "FCA"})</td><td class="right">${invoiceEur.toFixed(2)}</td><td class="right">${invoiceHuf.toLocaleString("hu-HU", {maximumFractionDigits:0})}</td></tr>
        <tr><td>Fuvar – külföldi szakasz</td><td class="right">${foreignFreightEur}</td><td class="right">${foreignFreightHuf.toLocaleString("hu-HU", {maximumFractionDigits:0})}</td></tr>
        <tr><td>Fuvar – belföldi szakasz</td><td class="right">${domesticFreightEur}</td><td class="right">${domesticFreightHuf.toLocaleString("hu-HU", {maximumFractionDigits:0})}</td></tr>
        <tr><td>Vámügynöki díj</td><td class="right">${customsAgentFeeEur}</td><td class="right">${customsAgentFeeHuf.toLocaleString("hu-HU", {maximumFractionDigits:0})}</td></tr>
      </tbody>
      <tfoot>
        <tr class="total-row"><td>VÉGÖSSZEG / TOTAL BASE</td><td class="right">${(invoiceEur + totalFreightEur + customsAgentFeeEur).toFixed(2)}</td><td class="right">${totalBase.toLocaleString("hu-HU", {maximumFractionDigits:0})} HUF</td></tr>
        <tr class="vat-row"><td>Tájékoztató ÁFA (27%)</td><td class="right"></td><td class="right">${indicativeVat.toLocaleString("hu-HU", {maximumFractionDigits:0})} HUF</td></tr>
      </tfoot>
    </table>

    <h2>MRN ADATOK / MRN DATA</h2>
    <div class="grid2">
      <div class="field"><div class="lbl">MRN szám</div><div class="val">${form.mrn_number || "—"}</div></div>
      <div class="field"><div class="lbl">MRN dátum</div><div class="val">${form.mrn_date || "—"}</div></div>
      <div class="field"><div class="lbl">MRN megállapított összeg</div><div class="val">${mrnDeclared ? mrnDeclared.toLocaleString("hu-HU") + " HUF" : "—"}</div></div>
      <div class="field"><div class="lbl">Számított ÁFA (27%)</div><div class="val">${indicativeVat.toLocaleString("hu-HU", {maximumFractionDigits:0})} HUF</div></div>
    </div>
    ${form.amendment_requested ? `
    <div class="mrn-compare">
      <div class="mrn-box"><div class="lbl2">Eredeti MRN</div><div class="val2">${form.mrn_number || "—"}</div><div style="font-size:8px;color:#92400e">${form.mrn_date || ""}</div></div>
      <div class="arrow">→</div>
      <div class="mrn-box"><div class="lbl2">2. (módosított) MRN</div><div class="val2" style="color:#b45309">${form.mrn_number_2 || "—"}</div><div style="font-size:8px;color:#b45309">${form.mrn_date_2 || ""}</div></div>
    </div>` : ""}

    <h2>CHECKLIST</h2>
    <div class="grid3">
      <div><span class="check">${form.ekaer ? "☑" : "☐"}</span> EKAER</div>
      <div><span class="check">${form.hs_code_verified ? "☑" : "☐"}</span> VTSZ ellenőrizve</div>
      <div><span class="check">${form.invoice_checked ? "☑" : "☐"}</span> Számla ellenőrizve</div>
    </div>
    ${form.checklist_notes ? `<div style="margin-top:8px;padding:6px 10px;background:#f8fafc;border-radius:4px;font-size:10px"><strong>Megjegyzés:</strong> ${form.checklist_notes}</div>` : ""}

    <div class="footer">
      <span>CARGONEX – Vámkezelési Ellenőrző Űrlap</span>
      <span>Dabas, ${today}</span>
    </div>
  </div>
</body>
</html>`);
    win.document.close();
    win.focus();
  };

  const handleDelete = async () => {
    if (deleteKey !== "1985") {
      toast.error("Helytelen mesterkulcs!");
      return;
    }
    await base44.entities.Truck.delete(truck.id);
    toast.success("Törölve");
    setShowDeleteConfirm(false);
    onUpdated();
  };

  const handleReopen = async () => {
    if (reopenKey !== "1985") {
      toast.error("Helytelen mesterkulcs!");
      return;
    }
    await base44.entities.Truck.update(truck.id, { status: "finance_control" });
    toast.success("Fuvar újranyitva");
    setShowReopenConfirm(false);
    setReopenKey("");
    onUpdated();
  };

  const handleAmendment = async () => {
    if (amendmentKey !== "1985") {
      toast.error("Helytelen mesterkulcs!");
      return;
    }
    const now = new Date().toISOString();
    await base44.entities.Truck.update(truck.id, { amendment_requested: true, amendment_requested_at: now });
    toast.success("Javítási kérelem aktiválva");
    setShowAmendmentDialog(false);
    setAmendmentKey("");
    setForm((f) => ({ ...f, amendment_requested: true, amendment_requested_at: now }));
  };

  // Mentse le a 2. MRN adatokat azonnal, és zárolja őket
  const handleSaveMrn2 = async () => {
    if (!form.mrn_number_2?.trim()) {
      toast.error("A 2. MRN szám megadása kötelező a rögzítéshez!");
      return;
    }
    setSavingMrn2(true);
    await base44.entities.Truck.update(truck.id, {
      mrn_number_2: form.mrn_number_2,
      mrn_date_2: form.mrn_date_2,
      mrn_number_2_locked: true,
    });
    setSavingMrn2(false);
    setForm((f) => ({ ...f, mrn_number_2_locked: true }));
    toast.success("2. MRN rögzítve és zárolva");
  };

  const handleLockMrn2Override = async () => {
    if (lockMrn2Key !== "1985") {
      toast.error("Helytelen mesterkulcs!");
      return;
    }
    await base44.entities.Truck.update(truck.id, { mrn_number_2_locked: false });
    setForm((f) => ({ ...f, mrn_number_2_locked: false }));
    setShowLockMrn2Dialog(false);
    setLockMrn2Key("");
    toast.success("2. MRN szerkesztés feloldva");
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
    <div className="space-y-5 max-w-5xl" style={{ background: "linear-gradient(135deg, #f8f9fb 0%, #e8ecf4 100%)", padding: "1.5rem", borderRadius: "16px" }}>
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

      {/* === ÁTTEKINTÉS / OVERVIEW === */}
      <div className="rounded-xl p-5 shadow-lg" style={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(226,232,240,0.8)" }}>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Áttekintés / Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Feladó */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-500 border-b border-slate-200 pb-1">FELADÓ / SHIPPER</h4>
            <div>
              <p className="text-xs text-slate-400">Név</p>
              <p className="text-sm font-semibold text-slate-800">{truck.supplier_name || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Telephely</p>
              <p className="text-sm font-semibold text-slate-800">{truck.supplier_site_name || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Ország</p>
              <p className="text-sm font-semibold text-slate-800">{truck.origin_country || "—"}</p>
            </div>
          </div>

          {/* Center: Logisztika */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-500 border-b border-slate-200 pb-1">LOGISZTIKA</h4>
            <div>
              <p className="text-xs text-slate-400">Fuvarozó</p>
              <p className="text-sm font-semibold text-slate-800">{truck.carrier_name || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Vámügynök</p>
              <p className="text-sm font-semibold text-slate-800">{truck.customs_agent_name || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Célállomás</p>
              <p className="text-sm font-semibold text-slate-800">
                {[truck.destination_country, truck.destination_zip, truck.destination_city].filter(Boolean).join(" ")}
              </p>
            </div>
          </div>

          {/* Right: Árak & Költségek */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-500 border-b border-slate-200 pb-1">ÁRAK & KÖLTSÉGEK</h4>
            <div>
              <p className="text-xs text-slate-400">Paritás</p>
              <p className="text-sm font-semibold text-slate-800">{truck.incoterms_type || "FCA"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Vételár</p>
              <p className="text-sm font-semibold text-slate-800">{purchasePrice ? `${purchasePrice} EUR/t` : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Külföldi fuvar</p>
              <p className="text-sm font-semibold text-slate-800">{foreignFreightEur ? `${foreignFreightEur} EUR` : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Belföldi fuvar</p>
              <p className="text-sm font-semibold text-slate-800">{domesticFreightEur ? `${domesticFreightEur} EUR` : "—"}</p>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <p className="text-xs text-slate-400">Összes fuvar</p>
              <p className="text-sm font-bold text-blue-700">{totalFreightEur.toFixed(2)} EUR</p>
              {exchangeRate > 0 && <p className="text-xs text-slate-500">{fmt(totalFreightHuf)} HUF</p>}
            </div>
            <div>
              <p className="text-xs text-slate-400">Vámügynöki díj</p>
              <p className="text-sm font-semibold text-slate-800">{customsAgentFeeEur ? `${customsAgentFeeEur} EUR` : "—"}</p>
            </div>
            <div className="pt-2 border-t border-blue-200 bg-blue-50 -mx-3 px-3 py-2 rounded">
              <p className="text-xs text-slate-500">Belföldi + vámkezelés</p>
              <p className="text-sm font-bold text-blue-700">{domesticAndCustomsEur.toFixed(2)} EUR</p>
              {exchangeRate > 0 && <p className="text-xs text-slate-600">{fmt(domesticAndCustomsHuf)} HUF</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Checklist & Customs Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Checklist */}
        <div className="rounded-xl p-5 space-y-4 shadow-lg" style={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(226,232,240,0.8)" }}>
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
        <div className="rounded-xl p-5 space-y-3 shadow-lg" style={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(226,232,240,0.8)" }}>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vámadatok / Customs Data</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-500 text-xs">Tény. súly (t)</Label>
              <Input type="number" className="mt-1 bg-slate-50" value={form.actual_weight_tons} onChange={(e) => set("actual_weight_tons", e.target.value)} disabled={isClosed} />
              {actualWeight > 0 && <p className="text-xs text-slate-500 mt-1">{(actualWeight * 1000).toFixed(0)} kg</p>}
            </div>
            <div>
              <Label className="text-slate-500 text-xs">Árfolyam (EUR→HUF) *</Label>
              <Input type="number" step="0.01" className={`mt-1 ${!form.exchange_rate && !isClosed ? "border-orange-300 bg-orange-50" : "bg-amber-50 border-amber-300"}`} placeholder="pl. 400" value={form.exchange_rate} onChange={(e) => set("exchange_rate", e.target.value)} disabled={isClosed} />
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
            <div className="col-span-2 pt-2 border-t border-slate-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox checked={form.amendment_requested} onCheckedChange={(v) => set("amendment_requested", v)} disabled={isClosed} />
                <span className="text-sm font-medium text-slate-700">Módosítási kérelem benyújtva (2. MRN várható)</span>
              </label>
            </div>
            {form.amendment_requested && (
              <div className="col-span-2">
                {/* MRN összehasonlítás panel */}
                <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <FileEdit className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-bold text-amber-800">2. MRN – Módosítási kérelem</span>
                    {form.amendment_requested_at && (
                      <span className="ml-auto text-xs text-amber-600">
                        Aktiválva: {new Date(form.amendment_requested_at).toLocaleDateString("hu-HU")}
                      </span>
                    )}
                  </div>

                  {/* Régi vs. Új MRN összehasonlítás */}
                  {(form.mrn_number || form.mrn_number_2) && (
                    <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-amber-200">
                      <div className="flex-1 text-center">
                        <p className="text-xs text-slate-400 mb-1">Eredeti MRN</p>
                        <p className="text-sm font-mono font-bold text-slate-700">{form.mrn_number || "—"}</p>
                        {form.mrn_date && <p className="text-xs text-slate-400 mt-0.5">{form.mrn_date}</p>}
                      </div>
                      <ArrowRight className="w-5 h-5 text-amber-400 flex-shrink-0" />
                      <div className="flex-1 text-center">
                        <p className="text-xs text-slate-400 mb-1">2. (módosított) MRN</p>
                        <p className="text-sm font-mono font-bold text-amber-700">{form.mrn_number_2 || "—"}</p>
                        {form.mrn_date_2 && <p className="text-xs text-amber-500 mt-0.5">{form.mrn_date_2}</p>}
                      </div>
                    </div>
                  )}

                  {/* 2. MRN beviteli mezők */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-slate-600 text-xs">2. MRN szám</Label>
                      <Input
                        className="mt-1 bg-white border-amber-300"
                        value={form.mrn_number_2}
                        onChange={(e) => set("mrn_number_2", e.target.value)}
                        disabled={form.mrn_number_2_locked}
                        placeholder="Módosított MRN"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-600 text-xs">2. MRN dátum</Label>
                      <Input
                        type="date"
                        className="mt-1 bg-white border-amber-300"
                        value={form.mrn_date_2}
                        onChange={(e) => set("mrn_date_2", e.target.value)}
                        disabled={form.mrn_number_2_locked}
                      />
                    </div>
                  </div>

                  {/* Rögzítés / Zárolás gomb */}
                  {!form.mrn_number_2_locked ? (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleSaveMrn2}
                        disabled={savingMrn2}
                        className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        {savingMrn2 ? "Rögzítés..." : "2. MRN Rögzítése & Zárolás"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-medium text-green-700">2. MRN rögzítve és zárolva</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowLockMrn2Dialog(true)}
                        className="text-xs text-slate-400 hover:text-slate-600 gap-1"
                      >
                        <FileEdit className="w-3 h-3" /> Feloldás
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* === KALKULÁCIÓ === */}
      <div className="rounded-xl p-5 shadow-lg" style={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(226,232,240,0.8)" }}>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Kalkuláció / Calculation</h3>
        {exchangeRate === 0 && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-300 rounded-lg flex items-center gap-2 text-sm text-orange-700">
            <AlertCircle className="w-4 h-4" />
            <span>Kérlek add meg az árfolyamot a kalkuláció megjelenítéséhez!</span>
          </div>
        )}
        <div className="space-y-2 text-sm">
          {/* Invoice line */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <span className="font-medium text-slate-700">Számla összege ({truck.incoterms_type || "FCA"})</span>
              <span className="text-slate-400 ml-2 text-xs">
                {actualWeight} t × {purchasePrice} EUR/t = {fmt(invoiceEur, 2)} EUR
              </span>
            </div>
            <div className="text-right">
              <div className="font-bold text-slate-800">{fmt(invoiceHuf, 0)} HUF</div>
            </div>
          </div>

          {/* Freight lines */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <span className="font-medium text-slate-700">Fuvar – külföldi szakasz</span>
              <span className="text-slate-400 ml-2 text-xs">{foreignFreightEur} EUR</span>
            </div>
            <div className="font-semibold text-slate-700">{fmt(foreignFreightHuf, 0)} HUF</div>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <span className="font-medium text-slate-700">Fuvar – belföldi szakasz</span>
              <span className="text-slate-400 ml-2 text-xs">{domesticFreightEur} EUR</span>
            </div>
            <div className="font-semibold text-slate-700">{fmt(domesticFreightHuf, 0)} HUF</div>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-blue-200 bg-blue-50 -mx-3 px-3">
            <div>
              <span className="font-semibold text-blue-700">Belföldi fuvar + vámkezelés</span>
              <span className="text-slate-500 ml-2 text-xs">{domesticAndCustomsEur.toFixed(2)} EUR</span>
            </div>
            <div className="font-bold text-blue-700">{fmt(domesticAndCustomsHuf, 0)} HUF</div>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <span className="font-medium text-slate-700">Vám (vámügynöki díj)</span>
              <span className="text-slate-400 ml-2 text-xs">{customsAgentFeeEur} EUR</span>
            </div>
            <div className="font-semibold text-slate-700">{fmt(customsAgentFeeHuf, 0)} HUF</div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between py-3 bg-slate-50 rounded-lg px-3 mt-2">
            <span className="font-bold text-slate-800 text-base">Végösszeg / Total Base</span>
            <div className="text-right">
              <div className="font-bold text-blue-700 text-lg">{fmt(totalBase, 0)} HUF</div>
              <div className="text-xs text-slate-500">{(invoiceEur + totalFreightEur + customsAgentFeeEur).toFixed(2)} EUR</div>
            </div>
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
              Lezáráshoz szükséges: Eladó számlaszáma, Fuvar számla, MRN szám, árfolyam
            </p>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => setShowAmendmentDialog(true)} className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
              <FileEdit className="w-4 h-4" /> Javítás
            </Button>
            {truck.status !== "closed" && (
              <Button variant="outline" onClick={() => setShowDeleteConfirm(true)} className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4" /> Törlés
              </Button>
            )}
            {truck.status === "closed" && (
              <Button variant="outline" onClick={() => setShowDeleteConfirm(true)} className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4" /> Törlés (véglegesített)
              </Button>
            )}
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" /> Nyomtatás
            </Button>
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
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium">Ez a fuvar le van zárva és véglegesítve.</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" /> Nyomtatás
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAmendmentDialog(true)}
              className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <FileEdit className="w-4 h-4" /> Javítás
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReopenConfirm(true)}
              className="gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
            >
              <Lock className="w-4 h-4" /> Újranyitás
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Biztosan törlöd ezt a fuvarrekordot?</AlertDialogTitle>
            <AlertDialogDescription>
              Ez a művelet nem visszavonható. Add meg a mesterkulcsot a törlés megerősítéséhez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label className="text-sm text-slate-600">Mesterkulcs</Label>
            <Input
              type="password"
              placeholder="Írd be a mesterkulcsot"
              value={deleteKey}
              onChange={(e) => setDeleteKey(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteKey("")}>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Törlés
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reopen Confirmation Dialog */}
      <AlertDialog open={showReopenConfirm} onOpenChange={setShowReopenConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fuvar újranyitása</AlertDialogTitle>
            <AlertDialogDescription>
              Ez újra szerkeszthetővé teszi a véglegesített fuvarrekordot. Add meg a mesterkulcsot a megerősítéshez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label className="text-sm text-slate-600">Mesterkulcs</Label>
            <Input
              type="password"
              placeholder="Írd be a mesterkulcsot"
              value={reopenKey}
              onChange={(e) => setReopenKey(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReopenKey("")}>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={handleReopen} className="bg-amber-600 hover:bg-amber-700">
              Újranyitás
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lock MRN2 Override Dialog */}
      <AlertDialog open={showLockMrn2Dialog} onOpenChange={setShowLockMrn2Dialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>2. MRN zárolás feloldása</AlertDialogTitle>
            <AlertDialogDescription>
              A 2. MRN szám és dátum módosításához add meg a mesterkulcsot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label className="text-sm text-slate-600">Mesterkulcs</Label>
            <Input
              type="password"
              placeholder="Írd be a mesterkulcsot"
              value={lockMrn2Key}
              onChange={(e) => setLockMrn2Key(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLockMrn2Key("")}>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={handleLockMrn2Override} className="bg-amber-600 hover:bg-amber-700">
              Feloldás
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Amendment Request Dialog */}
      <AlertDialog open={showAmendmentDialog} onOpenChange={setShowAmendmentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Javítási kérelem aktiválása</AlertDialogTitle>
            <AlertDialogDescription>
              Ez aktiválja a módosítási kérelem státuszt és feloldja a 2. MRN mezőket. Add meg a mesterkulcsot a megerősítéshez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label className="text-sm text-slate-600">Mesterkulcs</Label>
            <Input
              type="password"
              placeholder="Írd be a mesterkulcsot"
              value={amendmentKey}
              onChange={(e) => setAmendmentKey(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAmendmentKey("")}>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={handleAmendment} className="bg-blue-600 hover:bg-blue-700">
              Javítás aktiválása
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
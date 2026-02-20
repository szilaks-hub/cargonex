import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, XCircle, Search } from "lucide-react";

const fmt = (n, decimals = 0) =>
  n ? Number(n).toLocaleString("hu-HU", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : "—";

function getMrnStatus(indicativeVat, mrnDeclared) {
  if (!mrnDeclared || !indicativeVat) return "none";
  const diff = Math.abs(indicativeVat - mrnDeclared) / indicativeVat * 100;
  if (diff <= 0.5) return "match";
  if (diff <= 1) return "warn";
  return "error";
}

export default function MrnStatistics({ trucks }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  // Only trucks with MRN data
  const mrnTrucks = useMemo(() => {
    return trucks.filter(t => t.mrn_number || t.mrn_date);
  }, [trucks]);

  const filtered = useMemo(() => {
    let list = mrnTrucks;
    if (dateFrom) list = list.filter(t => t.mrn_date && t.mrn_date >= dateFrom);
    if (dateTo) list = list.filter(t => t.mrn_date && t.mrn_date <= dateTo);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(t =>
        (t.mrn_number || "").toLowerCase().includes(s) ||
        (t.truck_number || "").toLowerCase().includes(s) ||
        (t.supplier_invoice_number || "").toLowerCase().includes(s) ||
        (t.freight_invoice_number || "").toLowerCase().includes(s)
      );
    }
    // Sort by mrn_date desc
    return [...list].sort((a, b) => (b.mrn_date || "").localeCompare(a.mrn_date || ""));
  }, [mrnTrucks, dateFrom, dateTo, search]);

  // Summary totals
  const totalBase = filtered.reduce((s, t) => s + (t.total_base || 0), 0);
  const totalIndicativeVat = filtered.reduce((s, t) => s + (t.calculated_vat || t.total_base * 0.27 || 0), 0);
  const totalMrnDeclared = filtered.reduce((s, t) => s + (t.mrn_declared_amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <Label className="text-xs text-slate-500">MRN dátumtól</Label>
            <Input type="date" className="mt-1 w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-slate-500">MRN dátumig</Label>
            <Input type="date" className="mt-1 w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div className="flex-1 min-w-48">
            <Label className="text-xs text-slate-500">Keresés (MRN, rendszám, számlaszám)</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input className="pl-8" placeholder="Keresés..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 bg-slate-50">
          <p className="text-xs text-slate-400">Rekordok</p>
          <p className="text-2xl font-bold text-slate-800">{filtered.length}</p>
        </Card>
        <Card className="p-3 bg-blue-50">
          <p className="text-xs text-slate-400">Végösszeg (HUF)</p>
          <p className="text-lg font-bold text-blue-700">{fmt(totalBase)}</p>
        </Card>
        <Card className="p-3 bg-amber-50">
          <p className="text-xs text-slate-400">Tájékoztató ÁFA (HUF)</p>
          <p className="text-lg font-bold text-amber-700">{fmt(totalIndicativeVat)}</p>
        </Card>
        <Card className="p-3 bg-purple-50">
          <p className="text-xs text-slate-400">MRN megállapított (HUF)</p>
          <p className="text-lg font-bold text-purple-700">{fmt(totalMrnDeclared)}</p>
        </Card>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                <th className="py-2.5 px-3">MRN dátum</th>
                <th className="py-2.5 px-3">MRN szám</th>
                <th className="py-2.5 px-3">Rendszám</th>
                <th className="py-2.5 px-3">Termék</th>
                <th className="py-2.5 px-3">Eladó számlaszáma</th>
                <th className="py-2.5 px-3">Fuvar számlaszám</th>
                <th className="py-2.5 px-3 text-right">Végösszeg (HUF)</th>
                <th className="py-2.5 px-3 text-right">Táj. ÁFA (HUF)</th>
                <th className="py-2.5 px-3 text-right">MRN megállapított (HUF)</th>
                <th className="py-2.5 px-3 text-center">Kontroll</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center py-8 text-slate-400">Nincs adat a megadott szűrőre</td></tr>
              )}
              {filtered.map(t => {
                const indicVat = t.calculated_vat || (t.total_base * 0.27) || 0;
                const mrnStatus = getMrnStatus(indicVat, t.mrn_declared_amount);
                const statusEl = {
                  none: <span className="text-slate-300">—</span>,
                  match: <span className="flex items-center gap-1 text-green-600 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" />Egyezik</span>,
                  warn: <span className="flex items-center gap-1 text-orange-500 font-semibold"><AlertCircle className="w-3.5 h-3.5" />≤1%</span>,
                  error: <span className="flex items-center gap-1 text-red-600 font-semibold"><XCircle className="w-3.5 h-3.5" />&gt;1%</span>,
                }[mrnStatus];

                const rowBg = { match: "bg-green-50/40", warn: "bg-orange-50/50", error: "bg-red-50/50", none: "" }[mrnStatus];

                return (
                  <tr key={t.id} className={`border-b hover:brightness-95 transition-colors ${rowBg}`}>
                    <td className="py-2 px-3 font-medium text-slate-700 whitespace-nowrap">{t.mrn_date || "—"}</td>
                    <td className="py-2 px-3 font-mono text-slate-800 whitespace-nowrap">{t.mrn_number || "—"}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">{t.truck_number || `T-${t.id?.slice(0,6)}`}</td>
                    <td className="py-2 px-3 text-slate-600 max-w-[8rem] truncate">{t.product_name || "—"}</td>
                    <td className="py-2 px-3 text-slate-700 whitespace-nowrap">{t.supplier_invoice_number || "—"}</td>
                    <td className="py-2 px-3 text-slate-700 whitespace-nowrap">{t.freight_invoice_number || "—"}</td>
                    <td className="py-2 px-3 text-right font-semibold text-blue-700 whitespace-nowrap">{fmt(t.total_base)}</td>
                    <td className="py-2 px-3 text-right font-semibold text-amber-700 whitespace-nowrap">{fmt(indicVat)}</td>
                    <td className="py-2 px-3 text-right font-semibold text-purple-700 whitespace-nowrap">{fmt(t.mrn_declared_amount)}</td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">{statusEl}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Printer, Upload } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";

const STATUS_LABELS = {
  loaded: "Megrakott",
  finance_control: "Pénzügyi kontrol",
  closed: "Lezárt",
};

export default function FinancePrint({ trucks, orderbookMap, onClose }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [logoUrl, setLogoUrl] = useState(null);
  const fileRef = useRef();

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  const filtered = trucks.filter((t) => {
    const date = t.loading_date || t.actual_loading_date || t.mrn_date || "";
    if (fromDate && date < fromDate) return false;
    if (toDate && date > toDate) return false;
    return true;
  });

  const totalTons = filtered.reduce((s, t) => s + (t.actual_weight_tons || t.planned_quantity_tons || 0), 0);
  const totalHuf = filtered.reduce((s, t) => s + (t.total_base || 0), 0);

  const handlePrint = () => window.print();

  const fmt = (n) => n ? Number(n).toLocaleString("hu-HU") : "—";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl mx-4">
        {/* Controls - hidden on print */}
        <div className="print:hidden flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">🖨️ Nyomtatási előnézet – Finance / Vámkezelés</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="print:hidden p-5 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Dátum (-tól)</label>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Dátum (-ig)</label>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-40" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Logó feltöltése</label>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => fileRef.current.click()} className="gap-2">
                <Upload className="w-4 h-4" /> {logoUrl ? "Csere" : "Feltöltés"}
              </Button>
              {logoUrl && <button onClick={() => setLogoUrl(null)} className="text-xs text-red-500 hover:underline">Törlés</button>}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>
          </div>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 ml-auto">
            <Printer className="w-4 h-4" /> Nyomtatás
          </Button>
        </div>

        {/* Printable content */}
        <div className="p-8 print:p-6" id="print-area">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Finance / Vámkezelési Riport</h1>
              <div className="text-sm text-slate-500">
                {fromDate || toDate ? (
                  <span>
                    Időszak: <strong>{fromDate || "—"}</strong> – <strong>{toDate || "—"}</strong>
                  </span>
                ) : (
                  <span>Összes rekord</span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-1">Nyomtatva: {new Date().toLocaleDateString("hu-HU")}</div>
            </div>
            {logoUrl && (
              <img src={logoUrl} alt="Logó" className="h-16 object-contain" />
            )}
          </div>

          {/* Summary strip */}
          <div className="flex gap-6 mb-6 bg-slate-50 rounded-xl p-4 border border-slate-200 print:border print:rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-extrabold text-blue-700">{filtered.length}</div>
              <div className="text-xs text-slate-500 mt-0.5">Rekord</div>
            </div>
            <div className="w-px bg-slate-200" />
            <div className="text-center">
              <div className="text-2xl font-extrabold text-emerald-700">{totalTons.toLocaleString("hu-HU", { maximumFractionDigits: 2 })}</div>
              <div className="text-xs text-slate-500 mt-0.5">Össz. tonna (t)</div>
            </div>
            <div className="w-px bg-slate-200" />
            <div className="text-center">
              <div className="text-2xl font-extrabold text-slate-800">{fmt(totalHuf)}</div>
              <div className="text-xs text-slate-500 mt-0.5">Végösszeg (HUF)</div>
            </div>
            <div className="w-px bg-slate-200" />
            <div className="text-center">
              <div className="text-2xl font-extrabold text-orange-600">{filtered.filter(t => t.mrn_number).length}</div>
              <div className="text-xs text-slate-500 mt-0.5">MRN szám</div>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-3 py-2.5 text-left font-semibold rounded-tl-lg">#</th>
                <th className="px-3 py-2.5 text-left font-semibold">Rendszám</th>
                <th className="px-3 py-2.5 text-left font-semibold">Rendelésszám</th>
                <th className="px-3 py-2.5 text-left font-semibold">Termék</th>
                <th className="px-3 py-2.5 text-left font-semibold">Dátum</th>
                <th className="px-3 py-2.5 text-right font-semibold">Tény. (t)</th>
                <th className="px-3 py-2.5 text-left font-semibold">Fuvarozó</th>
                <th className="px-3 py-2.5 text-left font-semibold">Eladó számlasz.</th>
                <th className="px-3 py-2.5 text-left font-semibold">MRN szám / Dátum</th>
                <th className="px-3 py-2.5 text-right font-semibold rounded-tr-lg">Végösszeg (HUF)</th>
                <th className="px-3 py-2.5 text-left font-semibold">Státusz</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => {
                const ob = orderbookMap[t.orderbook_id];
                const isEven = i % 2 === 0;
                return (
                  <tr key={t.id} className={`border-b border-slate-200 ${isEven ? "bg-white" : "bg-slate-50"}`}>
                    <td className="px-3 py-2.5 text-slate-500 font-medium">{i + 1}</td>
                    <td className="px-3 py-2.5 font-bold text-slate-900">{t.truck_number || `T-${t.id?.slice(0, 6)}`}</td>
                    <td className="px-3 py-2.5">
                      {ob ? (
                        <div>
                          {ob.supplier_order_no && <div className="font-semibold text-slate-800">{ob.supplier_order_no}</div>}
                          {ob.system_order_no && <div className="text-blue-700 font-medium">{ob.system_order_no}</div>}
                        </div>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {t.items && t.items.length > 0 ? (
                        <div className="space-y-0.5">
                          {t.items.map((item, ii) => (
                            <div key={ii}>{item.product_name || item.category_name || "—"}{item.planned_quantity_tons ? ` (${item.planned_quantity_tons}t)` : ""}</div>
                          ))}
                        </div>
                      ) : (t.product_name || "—")}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{t.loading_date || t.actual_loading_date || "—"}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-900">{(t.actual_weight_tons || t.planned_quantity_tons || 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-slate-700">{t.carrier_name || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-700">{t.supplier_invoice_number || "—"}</td>
                    <td className="px-3 py-2.5">
                      {t.mrn_number ? (
                        <div>
                          <div className="font-bold text-slate-900">{t.mrn_number}</div>
                          {t.mrn_date && <div className="text-slate-500">{t.mrn_date}</div>}
                        </div>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-900">{t.total_base ? Number(t.total_base).toLocaleString("hu-HU") : "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.status === "closed" ? "bg-emerald-100 text-emerald-700" :
                        t.status === "finance_control" ? "bg-yellow-100 text-yellow-700" :
                        "bg-orange-100 text-orange-700"
                      }`}>
                        {STATUS_LABELS[t.status] || t.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="11" className="px-3 py-8 text-center text-slate-400">Nincs adat a megadott időszakra</td></tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-slate-800 text-white font-bold">
                  <td colSpan="5" className="px-3 py-2.5 rounded-bl-lg">Összesen ({filtered.length} rekord)</td>
                  <td className="px-3 py-2.5 text-right">{totalTons.toLocaleString("hu-HU", { maximumFractionDigits: 2 })} t</td>
                  <td colSpan="3" className="px-3 py-2.5"></td>
                  <td className="px-3 py-2.5 text-right rounded-br-lg">{fmt(totalHuf)} HUF</td>
                  <td className="px-3 py-2.5"></td>
                </tr>
              </tfoot>
            )}
          </table>

          <div className="mt-6 text-xs text-slate-400 text-center print:mt-4">
            CARGONEX – Finance / Vámkezelési Riport · {new Date().toLocaleString("hu-HU")}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: fixed; inset: 0; padding: 20px; font-size: 11px; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
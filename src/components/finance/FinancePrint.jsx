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
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem("finance_print_logo") || null);
  const fileRef = useRef();

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoUrl(ev.target.result);
      localStorage.setItem("finance_print_logo", ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
    localStorage.removeItem("finance_print_logo");
  };

  const filtered = trucks.filter((t) => {
    const date = t.loading_date || t.actual_loading_date || t.mrn_date || "";
    if (fromDate && date < fromDate) return false;
    if (toDate && date > toDate) return false;
    return true;
  });

  const totalTons = filtered.reduce((s, t) => s + (t.actual_weight_tons || t.planned_quantity_tons || 0), 0);
  const totalHuf = filtered.reduce((s, t) => s + (t.total_base || 0), 0);

  const handlePrint = () => {
    const printContent = document.getElementById("print-area");
    if (!printContent) return;
    const win = window.open("", "_blank", "width=1200,height=800");
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>Finance / Vámkezelési Riport</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: Arial, sans-serif; font-size: 10px; color: #0f172a; margin: 0; padding: 8mm; }
          table { border-collapse: collapse; width: 100%; font-size: 10px; }
          th, td { border: 1px solid #94a3b8; padding: 4px 6px; vertical-align: top; }
          thead tr { background: #1e293b; color: white; }
          tfoot tr { background: #1e293b; color: white; font-weight: bold; }
          .even { background: #f8fafc; }
          .odd { background: #ffffff; }
          .status-closed { background: #d1fae5; color: #065f46; padding: 1px 4px; border-radius: 3px; font-weight: bold; font-size: 9px; }
          .status-finance { background: #fef9c3; color: #854d0e; padding: 1px 4px; border-radius: 3px; font-weight: bold; font-size: 9px; }
          .status-loaded { background: #ffedd5; color: #9a3412; padding: 1px 4px; border-radius: 3px; font-weight: bold; font-size: 9px; }
          h1 { font-size: 16px; margin: 0 0 4px 0; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
          .summary { display: flex; gap: 24px; margin-bottom: 12px; padding: 8px 12px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; }
          .summary-item { text-align: center; }
          .summary-item .val { font-size: 18px; font-weight: 900; }
          .summary-item .lbl { font-size: 9px; color: #64748b; }
          .blue { color: #1d4ed8; } .green { color: #065f46; } .orange { color: #c2410c; } .dark { color: #1e293b; }
          .text-right { text-align: right; }
          .font-bold { font-weight: 700; }
          .sub { color: #64748b; font-size: 9px; }
          .blue-sub { color: #1d4ed8; font-size: 9px; }
          .mrn-dup { color: #c2410c; font-weight: bold; }
          img.logo { height: 50px; object-fit: contain; }
          .footer { margin-top: 12px; text-align: center; font-size: 9px; color: #94a3b8; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const fmt = (n) => n ? Number(n).toLocaleString("hu-HU") : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8" style={{ background: "rgba(15,23,60,0.7)", backdropFilter: "blur(4px)" }}>
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
              {logoUrl && <button onClick={handleRemoveLogo} className="text-xs text-red-500 hover:underline">Törlés</button>}
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
          <table className="w-full text-xs" style={{ borderCollapse: "collapse", border: "1px solid #cbd5e1" }}>
            <thead>
              <tr style={{ background: "#1e293b", color: "white" }}>
                <th style={{ border: "1px solid #334155", padding: "6px 8px", textAlign: "left" }}>#</th>
                <th style={{ border: "1px solid #334155", padding: "6px 8px", textAlign: "left" }}>Rendszám</th>
                <th style={{ border: "1px solid #334155", padding: "6px 8px", textAlign: "left" }}>Rendelésszám</th>
                <th style={{ border: "1px solid #334155", padding: "6px 8px", textAlign: "left" }}>Termék</th>
                <th style={{ border: "1px solid #334155", padding: "6px 8px", textAlign: "left" }}>Dátum</th>
                <th style={{ border: "1px solid #334155", padding: "6px 8px", textAlign: "right" }}>Tény. (t)</th>
                <th style={{ border: "1px solid #334155", padding: "6px 8px", textAlign: "left" }}>Fuvarozó</th>
                <th style={{ border: "1px solid #334155", padding: "6px 8px", textAlign: "left" }}>Eladó számlasz.</th>
                <th style={{ border: "1px solid #334155", padding: "6px 8px", textAlign: "left" }}>MRN szám / Dátum</th>
                <th style={{ border: "1px solid #334155", padding: "6px 8px", textAlign: "right" }}>Végösszeg (HUF)</th>
                <th style={{ border: "1px solid #334155", padding: "6px 8px", textAlign: "left" }}>Státusz</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => {
                const ob = orderbookMap[t.orderbook_id];
                const rowBg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
                const td = { border: "1px solid #cbd5e1", padding: "5px 8px", background: rowBg, verticalAlign: "top", fontSize: "11px" };
                return (
                  <tr key={t.id}>
                    <td style={td} className="text-slate-500 font-medium">{i + 1}</td>
                    <td style={{...td, fontWeight: "700"}} className="text-slate-900">{t.truck_number || `T-${t.id?.slice(0, 6)}`}</td>
                    <td style={td}>
                      {ob ? (
                        <div>
                          {ob.supplier_order_no && <div className="font-semibold text-slate-800">{ob.supplier_order_no}</div>}
                          {ob.system_order_no && <div className="text-blue-700 font-medium">{ob.system_order_no}</div>}
                        </div>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td style={td} className="text-slate-700">
                      {t.items && t.items.length > 0 ? (
                        <div className="space-y-0.5">
                          {t.items.map((item, ii) => (
                            <div key={ii}>{item.product_name || item.category_name || "—"}{item.planned_quantity_tons ? ` (${item.planned_quantity_tons}t)` : ""}</div>
                          ))}
                        </div>
                      ) : (t.product_name || "—")}
                    </td>
                    <td style={{...td, whiteSpace: "nowrap"}} className="text-slate-600">{t.loading_date || t.actual_loading_date || "—"}</td>
                    <td style={{...td, textAlign: "right", fontWeight: "600"}} className="text-slate-900">{(t.actual_weight_tons || t.planned_quantity_tons || 0).toFixed(2)}</td>
                    <td style={td} className="text-slate-700">{t.carrier_name || "—"}</td>
                    <td style={td} className="text-slate-700">{t.supplier_invoice_number || "—"}</td>
                    <td style={td}>
                      {t.mrn_number ? (
                        <div>
                          <div className="font-bold text-slate-900">{t.mrn_number}</div>
                          {t.mrn_date && <div className="text-slate-500">{t.mrn_date}</div>}
                        </div>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td style={{...td, textAlign: "right", fontWeight: "600"}} className="text-slate-900">{t.total_base ? Number(t.total_base).toLocaleString("hu-HU") : "—"}</td>
                    <td style={td}>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
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
                <tr><td colSpan="11" style={{ border: "1px solid #cbd5e1", padding: "24px", textAlign: "center", color: "#94a3b8" }}>Nincs adat a megadott időszakra</td></tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr style={{ background: "#1e293b", color: "white", fontWeight: "700" }}>
                  <td colSpan="5" style={{ border: "1px solid #334155", padding: "6px 8px" }}>Összesen ({filtered.length} rekord)</td>
                  <td style={{ border: "1px solid #334155", padding: "6px 8px", textAlign: "right" }}>{totalTons.toLocaleString("hu-HU", { maximumFractionDigits: 2 })} t</td>
                  <td colSpan="3" style={{ border: "1px solid #334155", padding: "6px 8px" }}></td>
                  <td style={{ border: "1px solid #334155", padding: "6px 8px", textAlign: "right" }}>{fmt(totalHuf)} HUF</td>
                  <td style={{ border: "1px solid #334155", padding: "6px 8px" }}></td>
                </tr>
              </tfoot>
            )}
          </table>

          <div className="mt-6 text-xs text-slate-400 text-center print:mt-4">
            CARGONEX – Finance / Vámkezelési Riport · {new Date().toLocaleString("hu-HU")}
          </div>
        </div>
      </div>

      <style>{``}</style>
    </div>
  );
}
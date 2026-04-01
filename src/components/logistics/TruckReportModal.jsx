import React from "react";
import { Button } from "@/components/ui/button";
import { X, Printer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function TruckReportModal({ trucks, orderbookMap = {}, onClose }) {
  const today = new Date().toLocaleDateString("en-GB");

  const { data: sheets = [] } = useQuery({
    queryKey: ["freight-sheets-logo"],
    queryFn: () => base44.entities.FreightSheet.list(),
  });

  // Pick the first sheet that has a logo uploaded
  const logoUrl = sheets.find(s => s.sheet_logo_url)?.sheet_logo_url || null;

  const totalPlanned = trucks.reduce((s, t) => s + (Number(t.planned_quantity_tons) || 0), 0);

  const handlePrint = () => {
    const content = document.getElementById("truck-report-print");
    if (!content) return;
    const win = window.open("", "_blank", "width=1200,height=900");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>Truck Dispatch Report – ${today}</title>
    <style>
      @page { size: A4 landscape; margin: 12mm; }
      body { font-family: Arial, sans-serif; font-size: 9.5px; color: #0f172a; margin: 0; }
      .rh { display:flex; justify-content:space-between; align-items:center; border-bottom:2.5px solid #1e293b; padding-bottom:10px; margin-bottom:16px; }
      .rh img { max-height:60px; max-width:200px; object-fit:contain; }
      .rh-title { font-size:20px; font-weight:900; }
      .rh-sub { font-size:10px; color:#64748b; margin-top:3px; }
      .rh-meta { text-align:right; font-size:10px; color:#64748b; }
      table { border-collapse:collapse; width:100%; }
      thead th { background:#1e293b; color:white; padding:6px 8px; font-size:8.5px; font-weight:700; text-align:left; letter-spacing:0.04em; text-transform:uppercase; }
      tbody td { border:1px solid #cbd5e1; padding:5px 7px; vertical-align:top; }
      tbody tr:nth-child(even) td { background:#f8fafc; }
      tfoot td { background:#f1f5f9; font-weight:700; border-top:2px solid #1e293b; padding:6px 8px; }
      .footer { margin-top:16px; font-size:9px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:8px; display:flex; justify-content:space-between; }
      .empty { color:#94a3b8; font-style:italic; }
    </style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Truck Dispatch Report</h2>
            <p className="text-xs text-slate-500">{trucks.length} selected trucks · {today}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold gap-2">
              <Printer className="w-4 h-4" /> Print / PDF
            </Button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-auto flex-1 p-6">
          <div id="truck-report-print">

            {/* Report header (visible in print) */}
            <div className="rh" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"2.5px solid #1e293b", paddingBottom:10, marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                {logoUrl && <img src={logoUrl} alt="Logo" style={{ maxHeight:60, maxWidth:200, objectFit:"contain" }} />}
                <div>
                  <div className="rh-title" style={{ fontSize:20, fontWeight:900 }}>Truck Dispatch Report</div>
                  <div className="rh-sub" style={{ fontSize:10, color:"#64748b", marginTop:3 }}>Generated: {today}</div>
                </div>
              </div>
              <div className="rh-meta" style={{ textAlign:"right", fontSize:10, color:"#64748b" }}>
                <div><strong>Total trucks:</strong> {trucks.length}</div>
                <div><strong>Planned weight:</strong> {totalPlanned.toFixed(2)} t</div>
              </div>
            </div>

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-xs font-bold uppercase tracking-wide">
                  <th className="px-3 py-2.5 text-left">Plate No.</th>
                  <th className="px-3 py-2.5 text-left">Loading Date</th>
                  <th className="px-3 py-2.5 text-left">Order No.</th>
                  <th className="px-3 py-2.5 text-left">Product</th>
                  <th className="px-3 py-2.5 text-right">Planned Qty (t)</th>
                  <th className="px-3 py-2.5 text-right">Price / t</th>
                  <th className="px-3 py-2.5 text-left">Carrier</th>
                  <th className="px-3 py-2.5 text-left">Destination</th>
                </tr>
              </thead>
              <tbody>
                {trucks.map((t, i) => {
                  const ob = t.orderbook_id ? orderbookMap[t.orderbook_id] : null;
                  const dest = [t.destination_country, t.destination_city].filter(Boolean).join(" · ");
                  return (
                    <tr key={t.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-3 py-2 border border-slate-200 font-semibold">
                        {t.truck_number || <span className="text-slate-400 italic">—</span>}
                      </td>
                      <td className="px-3 py-2 border border-slate-200">
                        {t.expected_loading_date || t.loading_date || t.actual_loading_date || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-2 border border-slate-200">
                        {ob?.system_order_no || ob?.supplier_order_no || t.orderbook_no || t.order_number
                          ? <div>
                              {ob?.system_order_no && <div className="text-xs font-semibold text-blue-700">{ob.system_order_no}</div>}
                              {ob?.supplier_order_no && <div className="text-xs text-slate-500">{ob.supplier_order_no}</div>}
                              {!ob && (t.orderbook_no || t.order_number) && <div className="text-xs">{t.orderbook_no || t.order_number}</div>}
                            </div>
                          : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-2 border border-slate-200">{t.product_name || <span className="text-slate-400">—</span>}</td>
                      <td className="px-3 py-2 border border-slate-200 text-right font-semibold">
                        {t.planned_quantity_tons != null ? Number(t.planned_quantity_tons).toFixed(2) : "—"}
                      </td>
                      <td className="px-3 py-2 border border-slate-200 text-right">
                        {t.purchase_price != null ? Number(t.purchase_price).toLocaleString("en-GB") : "—"}
                      </td>
                      <td className="px-3 py-2 border border-slate-200">{t.carrier_name || <span className="text-slate-400">—</span>}</td>
                      <td className="px-3 py-2 border border-slate-200">{dest || <span className="text-slate-400">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={4} className="px-3 py-2.5 border border-slate-300">Total ({trucks.length} trucks)</td>
                  <td className="px-3 py-2.5 border border-slate-300 text-right">{totalPlanned.toFixed(2)} t</td>
                  <td colSpan={3} className="px-3 py-2.5 border border-slate-300"></td>
                </tr>
              </tfoot>
            </table>

            <div className="footer" style={{ marginTop:16, fontSize:9, color:"#94a3b8", borderTop:"1px solid #e2e8f0", paddingTop:8, display:"flex", justifyContent:"space-between" }}>
              <span>Truck Dispatch Report – Confidential</span>
              <span>Generated: {today}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
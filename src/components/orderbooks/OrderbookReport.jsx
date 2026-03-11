import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function OrderbookReport({ orderbook, lines, trucks, onClose }) {
  const printRef = useRef();

  if (!orderbook) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Rendelés kimutatás - ${orderbook.supplier_order_no || orderbook.order_no}</title>
          <style>
            @media print {
              @page { margin: 15mm; }
            }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 11pt; 
              line-height: 1.4;
              color: #333;
            }
            h1 { font-size: 18pt; margin-bottom: 4mm; color: #1e293b; }
            h2 { font-size: 14pt; margin: 6mm 0 3mm 0; color: #475569; border-bottom: 2px solid #cbd5e1; padding-bottom: 2mm; }
            table { width: 100%; border-collapse: collapse; margin: 4mm 0; }
            th, td { padding: 2mm 3mm; text-align: left; border: 1px solid #cbd5e1; }
            th { background: #f1f5f9; font-weight: 600; font-size: 10pt; }
            td { font-size: 10pt; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: 600; }
            .text-slate-600 { color: #475569; }
            .text-blue-700 { color: #1d4ed8; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin: 4mm 0; }
            .info-item { padding: 2mm; background: #f8fafc; border-left: 3px solid #3b82f6; }
            .info-label { font-size: 9pt; color: #64748b; }
            .info-value { font-size: 11pt; font-weight: 600; color: #1e293b; margin-top: 1mm; }
            .truck-card { 
              border: 1px solid #cbd5e1; 
              border-radius: 2mm; 
              padding: 3mm; 
              margin: 2mm 0;
              background: #fafafa;
            }
            .truck-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2mm; }
            .badge { 
              display: inline-block; 
              padding: 1mm 3mm; 
              border-radius: 1mm; 
              font-size: 9pt; 
              font-weight: 600;
            }
            .badge-green { background: #dcfce7; color: #166534; }
            .badge-orange { background: #fed7aa; color: #9a3412; }
            .badge-blue { background: #dbeafe; color: #1e40af; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const plannedTons = lines.reduce((s, l) => s + (l.planned_quantity_tons || 0), 0);
  const allocatedTons = lines.reduce((s, l) => s + (l.allocated_quantity_tons || 0), 0);
  const valueEUR = lines.reduce((s, l) => s + (l.line_value_eur || 0), 0);
  const remainingTons = plannedTons - allocatedTons;

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Printer className="w-4 h-4" /> Nyomtatás
        </Button>
        <Button variant="outline" onClick={onClose}>Bezárás</Button>
      </div>

      <div ref={printRef} className="bg-white p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Rendelés kimutatás</h1>
        <div className="text-sm text-slate-600 mb-6">
          Generálva: {new Date().toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>

        {/* Order Header */}
        <h2 className="text-lg font-semibold text-slate-700 border-b-2 border-slate-300 pb-2 mb-4">Rendelés adatai</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 bg-slate-50 border-l-4 border-blue-500">
            <div className="text-xs text-slate-600">Beszállítói rendelésszám</div>
            <div className="text-base font-bold text-slate-900 mt-1">{orderbook.supplier_order_no || '—'}</div>
          </div>
          <div className="p-3 bg-slate-50 border-l-4 border-blue-500">
            <div className="text-xs text-slate-600">Belső rendelésszám</div>
            <div className="text-base font-bold text-slate-900 mt-1">{orderbook.order_no}</div>
          </div>
          <div className="p-3 bg-slate-50">
            <div className="text-xs text-slate-600">Beszállító</div>
            <div className="text-base font-semibold text-slate-800 mt-1">{orderbook.supplier_name}</div>
          </div>
          <div className="p-3 bg-slate-50">
            <div className="text-xs text-slate-600">Telephely</div>
            <div className="text-base font-semibold text-slate-800 mt-1">{orderbook.supplier_site_name}</div>
          </div>
          <div className="p-3 bg-slate-50">
            <div className="text-xs text-slate-600">Rendelés dátuma</div>
            <div className="text-base font-semibold text-slate-800 mt-1">{orderbook.order_date}</div>
          </div>
          <div className="p-3 bg-slate-50">
            <div className="text-xs text-slate-600">Incoterms</div>
            <div className="text-base font-semibold text-slate-800 mt-1">{orderbook.incoterms_type} {orderbook.incoterms_place || ''}</div>
          </div>
        </div>

        {/* Category Lines */}
        <h2 className="text-lg font-semibold text-slate-700 border-b-2 border-slate-300 pb-2 mb-4">Termékkörök</h2>
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-semibold">
              <th className="py-2 px-3 text-left">Termékkör</th>
              <th className="py-2 px-3 text-right">Tervezett (t)</th>
              <th className="py-2 px-3 text-right">Ár (EUR/t)</th>
              <th className="py-2 px-3 text-right">Érték (EUR)</th>
              <th className="py-2 px-3 text-right">Allokált (t)</th>
              <th className="py-2 px-3 text-right">Hátra (t)</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={line.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="py-2 px-3 font-medium">{line.category_name}</td>
                <td className="py-2 px-3 text-right">{line.planned_quantity_tons?.toFixed(2)}</td>
                <td className="py-2 px-3 text-right">{line.unit_price_eur_per_ton?.toFixed(2)}</td>
                <td className="py-2 px-3 text-right">{(line.line_value_eur || 0).toFixed(0)}</td>
                <td className="py-2 px-3 text-right font-semibold text-blue-700">{(line.allocated_quantity_tons || 0).toFixed(2)}</td>
                <td className="py-2 px-3 text-right">{((line.planned_quantity_tons || 0) - (line.allocated_quantity_tons || 0)).toFixed(2)}</td>
              </tr>
            ))}
            <tr className="bg-slate-200 font-bold">
              <td className="py-2 px-3">Összesen</td>
              <td className="py-2 px-3 text-right">{plannedTons.toFixed(2)}</td>
              <td className="py-2 px-3"></td>
              <td className="py-2 px-3 text-right">{valueEUR.toFixed(0)}</td>
              <td className="py-2 px-3 text-right text-blue-700">{allocatedTons.toFixed(2)}</td>
              <td className="py-2 px-3 text-right">{remainingTons.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Trucks */}
        {trucks.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-slate-700 border-b-2 border-slate-300 pb-2 mb-4">
              Előjegyzett kamionok ({trucks.length})
            </h2>
            <div className="space-y-3">
              {trucks.map(truck => (
                <div key={truck.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-bold text-slate-900 text-base">{truck.truck_number || '—'}</div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      truck.status === 'booked' ? 'bg-slate-100 text-slate-700' :
                      truck.status === 'loaded' ? 'bg-orange-100 text-orange-700' :
                      truck.status === 'closed' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100'
                    }`}>
                      {truck.status === 'booked' ? 'Előjegyzett' : 
                       truck.status === 'loaded' ? 'Megrakott' : 
                       truck.status === 'closed' ? 'Lezárt' : truck.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm text-slate-700">
                    <div>
                      <div className="text-xs text-slate-500">Súly</div>
                      <div className="font-semibold">{truck.planned_quantity_tons || 0} t</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Fuvarozó</div>
                      <div className="font-semibold">{truck.carrier_name || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Rakodás dátuma</div>
                      <div className="font-semibold">{truck.expected_loading_date || truck.loading_date || '—'}</div>
                    </div>
                    <div className="col-span-3">
                      <div className="text-xs text-slate-500">Célállomás</div>
                      <div className="font-semibold">{truck.destination_country} {truck.destination_city ? `· ${truck.destination_city}` : ''}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Summary */}
        <div className="mt-6 pt-4 border-t-2 border-slate-300">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xs text-blue-600 font-medium">Tervezett tonnázs</div>
              <div className="text-2xl font-bold text-blue-900 mt-1">{plannedTons.toFixed(2)} t</div>
            </div>
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="text-xs text-emerald-600 font-medium">Allokált tonnázs</div>
              <div className="text-2xl font-bold text-emerald-900 mt-1">{allocatedTons.toFixed(2)} t</div>
            </div>
            <div className={`p-4 rounded-lg border ${remainingTons > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className={`text-xs font-medium ${remainingTons > 0 ? 'text-amber-600' : 'text-slate-600'}`}>Hátralevő</div>
              <div className={`text-2xl font-bold mt-1 ${remainingTons > 0 ? 'text-amber-900' : 'text-slate-900'}`}>{remainingTons.toFixed(2)} t</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
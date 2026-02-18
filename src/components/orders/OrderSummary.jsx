import React from "react";
import { Card } from "@/components/ui/card";

export default function OrderSummary({ lines }) {
  const totalOrdered = lines.reduce((sum, line) => sum + (line.ordered_quantity_tons || 0), 0);
  const totalValue = lines.reduce((sum, line) => sum + ((line.ordered_quantity_tons || 0) * (line.unit_price_per_ton || 0)), 0);
  const avgPrice = totalOrdered > 0 ? totalValue / totalOrdered : 0;

  // Category breakdown
  const byCategory = {};
  lines.forEach(line => {
    const cat = line.product_category_name || 'Unknown';
    if (!byCategory[cat]) byCategory[cat] = { tons: 0, value: 0 };
    byCategory[cat].tons += line.ordered_quantity_tons || 0;
    byCategory[cat].value += (line.ordered_quantity_tons || 0) * (line.unit_price_per_ton || 0);
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 bg-slate-50">
          <div className="text-xs text-slate-500 font-medium">Total Ordered</div>
          <div className="text-2xl font-bold text-slate-800">{totalOrdered.toFixed(2)}</div>
          <div className="text-xs text-slate-400">tons</div>
        </Card>
        <Card className="p-4 bg-slate-50">
          <div className="text-xs text-slate-500 font-medium">Avg Price</div>
          <div className="text-2xl font-bold text-slate-800">{avgPrice.toFixed(2)}</div>
          <div className="text-xs text-slate-400">EUR/ton</div>
        </Card>
        <Card className="p-4 bg-slate-50">
          <div className="text-xs text-slate-500 font-medium">Total Value</div>
          <div className="text-2xl font-bold text-slate-800">{(totalValue / 1000).toFixed(1)}</div>
          <div className="text-xs text-slate-400">k EUR</div>
        </Card>
        <Card className="p-4 bg-slate-50">
          <div className="text-xs text-slate-500 font-medium">Lines</div>
          <div className="text-2xl font-bold text-slate-800">{lines.length}</div>
          <div className="text-xs text-slate-400">items</div>
        </Card>
      </div>

      {Object.keys(byCategory).length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">By Category</h4>
          <div className="space-y-2">
            {Object.entries(byCategory).map(([cat, data]) => (
              <div key={cat} className="flex justify-between items-center text-sm py-2 border-b last:border-b-0">
                <div className="text-slate-600">{cat}</div>
                <div className="flex gap-4">
                  <span className="text-slate-800 font-medium">{data.tons.toFixed(2)} t</span>
                  <span className="text-slate-500 text-xs w-16 text-right">{(data.value / 1000).toFixed(1)}k EUR</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

/**
 * Multi-item editor for a single truck.
 * Each item: { product_id, product_name, category_name, planned_quantity_tons, purchase_price, hs_code }
 */
export default function TruckItemsEditor({ items, allowedProducts, categories, orderbookLines, onChange }) {
  const inp = "bg-white border-[#c6ccda] text-slate-800 h-8 text-xs";
  const lbl = "text-slate-500 text-[10px] font-semibold mb-0.5";

  const handleAdd = () => {
    onChange([...items, { product_id: "", product_name: "", category_name: "", planned_quantity_tons: "", purchase_price: "", hs_code: "" }]);
  };

  const handleRemove = (idx) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const handleChange = (idx, field, value) => {
    const updated = items.map((item, i) => i === idx ? { ...item, [field]: value } : item);
    onChange(updated);
  };

  const handleProductSelect = (idx, productId, products) => {
    const p = products.find(p => p.id === productId);
    const cat = categories.find(c => c.id === p?.category_id);
    const catName = cat?.name_en || cat?.name_hu || "";
    const productName = [catName, p?.diameter ? `Ø${p.diameter}` : "", p?.factory_code || ""].filter(Boolean).join(" ");
    
    // Find matching orderbook line for price + remaining qty
    const matchLine = orderbookLines.find(l => l.category_id === p?.category_id);
    const price = matchLine?.unit_price_eur_per_ton || "";
    const remaining = matchLine ? ((matchLine.planned_quantity_tons || 0) - (matchLine.allocated_quantity_tons || 0)) : null;

    const updated = items.map((item, i) => i === idx ? {
      ...item,
      product_id: productId,
      product_name: productName,
      category_name: catName,
      hs_code: p?.hs_code || "",
      purchase_price: price,
      _remaining: remaining,
      _category_id: p?.category_id,
    } : item);
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <Label className="text-slate-600 text-xs font-semibold">Termékek a kamionon</Label>
        <Button type="button" size="sm" variant="outline" onClick={handleAdd}
          className="h-7 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50">
          <Plus className="w-3.5 h-3.5" /> Termék hozzáadása
        </Button>
      </div>

      {items.length === 0 && (
        <div className="text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg p-4 text-center">
          Nincs termék — kattints a "+ Termék hozzáadása" gombra
        </div>
      )}

      {items.map((item, idx) => {
        const matchLine = item._category_id
          ? orderbookLines.find(l => l.category_id === item._category_id)
          : null;
        const allocated = matchLine?.allocated_quantity_tons || 0;
        const planned = matchLine?.planned_quantity_tons || 0;
        const remaining = planned - allocated;

        return (
          <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
            <div className="grid grid-cols-12 gap-2 items-end">
              {/* Product select */}
              <div className="col-span-5">
                <div className={lbl}>Termék *</div>
                <Select value={item.product_id} onValueChange={(v) => handleProductSelect(idx, v, allowedProducts)}>
                  <SelectTrigger className={inp}>
                    <SelectValue placeholder="Válassz terméket..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#c6ccda]">
                    {allowedProducts.map((p) => {
                      const cat = categories.find(c => c.id === p.category_id);
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          {cat?.name_en || cat?.name_hu} {p.diameter ? `Ø${p.diameter}` : ""} {p.factory_code || ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity */}
              <div className="col-span-2">
                <div className={lbl}>Mennyiség (t)</div>
                <Input type="number" className={inp} value={item.planned_quantity_tons}
                  onChange={(e) => handleChange(idx, "planned_quantity_tons", e.target.value)}
                  placeholder="t" />
              </div>

              {/* Price */}
              <div className="col-span-2">
                <div className={lbl}>Ár (EUR/t)</div>
                <Input type="number" className={inp} value={item.purchase_price}
                  onChange={(e) => handleChange(idx, "purchase_price", e.target.value)} />
              </div>

              {/* HS Code */}
              <div className="col-span-2">
                <div className={lbl}>HS Kód</div>
                <Input className={inp} value={item.hs_code}
                  onChange={(e) => handleChange(idx, "hs_code", e.target.value)} />
              </div>

              {/* Remove */}
              <div className="col-span-1 flex justify-end">
                <Button type="button" size="icon" variant="ghost"
                  onClick={() => handleRemove(idx)}
                  className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Category info row */}
            {item.product_id && matchLine && (
              <div className="flex gap-3 text-[10px] text-slate-500 bg-slate-50 rounded px-2 py-1">
                <span><span className="font-semibold text-slate-700">Termékkör:</span> {item.category_name}</span>
                <span><span className="font-semibold text-slate-700">Rendelt:</span> {planned} t</span>
                <span><span className="font-semibold text-slate-700">Allokált:</span> {allocated} t</span>
                <span className={`font-semibold ${remaining < 0 ? "text-red-600" : "text-green-700"}`}>
                  Hátramaradó: {remaining} t
                </span>
                {matchLine.unit_price_eur_per_ton && (
                  <span><span className="font-semibold text-slate-700">Rendelési ár:</span> {matchLine.unit_price_eur_per_ton} EUR/t</span>
                )}
              </div>
            )}
            {item.product_id && !matchLine && (
              <div className="text-[10px] text-slate-400 bg-slate-50 rounded px-2 py-1">
                Termékkör: {item.category_name}
              </div>
            )}
          </div>
        );
      })}

      {/* Total planned */}
      {items.length > 1 && (
        <div className="text-xs text-slate-600 text-right pr-1 font-semibold">
          Összesen: {items.reduce((s, i) => s + (parseFloat(i.planned_quantity_tons) || 0), 0).toFixed(2)} t
        </div>
      )}
    </div>
  );
}
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { X, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function OrderLineForm({ orderId, onLineAdded, isDraft }) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    product_category_id: "",
    diameter: "",
    specification: "",
    ordered_quantity_tons: "",
    unit_price_per_ton: "",
    target_delivery_period: "",
    notes: ""
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.ProductCategory.list(),
  });

  const handleSave = async () => {
    if (!formData.product_category_id || !formData.ordered_quantity_tons || !formData.unit_price_per_ton) {
      alert('Category, quantity, and unit price required');
      return;
    }

    const category = categories.find(c => c.id === formData.product_category_id);
    
    await base44.entities.PurchaseOrderLine.create({
      purchase_order_id: orderId,
      product_category_id: formData.product_category_id,
      product_category_name: category?.name_en,
      diameter: formData.diameter ? parseFloat(formData.diameter) : null,
      specification: formData.specification,
      ordered_quantity_tons: parseFloat(formData.ordered_quantity_tons),
      unit_price_per_ton: parseFloat(formData.unit_price_per_ton),
      target_delivery_period: formData.target_delivery_period,
      notes: formData.notes,
      sort_order: 0
    });

    setFormData({
      product_category_id: "",
      diameter: "",
      specification: "",
      ordered_quantity_tons: "",
      unit_price_per_ton: "",
      target_delivery_period: "",
      notes: ""
    });
    setIsAdding(false);
    onLineAdded?.();
  };

  if (!isDraft) {
    return null;
  }

  if (!isAdding) {
    return (
      <Button onClick={() => setIsAdding(true)} variant="outline" className="w-full gap-2">
        <Plus className="w-4 h-4" /> Add Line
      </Button>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-slate-700">New Line</h4>
        <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Select value={formData.product_category_id} onValueChange={(v) => setFormData({...formData, product_category_id: v})}>
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Category *" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name_en || cat.name_hu}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          placeholder="Diameter (mm)"
          className="text-sm"
          value={formData.diameter}
          onChange={(e) => setFormData({...formData, diameter: e.target.value})}
        />

        <Input
          type="text"
          placeholder="Specification (e.g., B500B, 12m, 8-16mm)"
          className="text-sm md:col-span-2"
          value={formData.specification}
          onChange={(e) => setFormData({...formData, specification: e.target.value})}
        />

        <Input
          type="number"
          placeholder="Ordered Qty (tons) *"
          className="text-sm"
          step="0.01"
          value={formData.ordered_quantity_tons}
          onChange={(e) => setFormData({...formData, ordered_quantity_tons: e.target.value})}
        />

        <Input
          type="number"
          placeholder="Unit Price (EUR/ton) *"
          className="text-sm"
          step="0.01"
          value={formData.unit_price_per_ton}
          onChange={(e) => setFormData({...formData, unit_price_per_ton: e.target.value})}
        />

        <Input
          type="text"
          placeholder="Target Delivery (March, Q2, etc.)"
          className="text-sm"
          value={formData.target_delivery_period}
          onChange={(e) => setFormData({...formData, target_delivery_period: e.target.value})}
        />

        <Input
          type="text"
          placeholder="Notes"
          className="text-sm md:col-span-2"
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleSave}>Add Line</Button>
      </div>
    </Card>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, Trash2 } from "lucide-react";

export default function ProductForm({ item, categories, onClose, onSaved }) {
  const [form, setForm] = useState(item || {
    category_id: "", category_name: "", diameter: "", length: "",
    additional_dimension: "", mesh_name: "", factory_code: "",
    unit_of_measure: "ton", conversion_factor: "", piece_weight: "",
    bundle_weight: "", hs_code: "", status: "active"
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const data = {
      ...form,
      diameter: form.diameter ? Number(form.diameter) : undefined,
      length: form.length ? Number(form.length) : undefined,
      conversion_factor: form.conversion_factor ? Number(form.conversion_factor) : undefined,
      piece_weight: form.piece_weight ? Number(form.piece_weight) : undefined,
      bundle_weight: form.bundle_weight ? Number(form.bundle_weight) : undefined,
    };
    if (item?.id) {
      await base44.entities.Product.update(item.id, data);
    } else {
      await base44.entities.Product.create(data);
    }
    setSaving(false);
    onSaved();
  };

  const handleDelete = async () => {
    if (item?.id) {
      await base44.entities.Product.delete(item.id);
      onSaved();
    }
  };

  return (
    <div className="bg-[#1a1e23] border border-[#2d333b] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#e6edf3]">
          {item ? "Edit Product / Szerkesztés" : "New Product / Új termék"}
        </h3>
        <button onClick={onClose} className="text-[#8b949e] hover:text-white"><X className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label className="text-[#8b949e] text-xs">Category / Kategória *</Label>
          <Select value={form.category_id} onValueChange={(v) => {
            const cat = categories.find((c) => c.id === v);
            set("category_id", v);
            set("category_name", cat ? `${cat.name_en} / ${cat.name_hu}` : "");
          }}>
            <SelectTrigger className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent className="bg-[#22272e] border-[#2d333b]">
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name_en} / {c.name_hu}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[#8b949e] text-xs">Factory Code / Gyári kód</Label>
          <Input className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.factory_code} onChange={(e) => set("factory_code", e.target.value)} />
        </div>
        <div>
          <Label className="text-[#8b949e] text-xs">HS Code / VTSZ *</Label>
          <Input className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.hs_code} onChange={(e) => set("hs_code", e.target.value)} />
        </div>
        <div>
          <Label className="text-[#8b949e] text-xs">Diameter (mm)</Label>
          <Input type="number" className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.diameter} onChange={(e) => set("diameter", e.target.value)} />
        </div>
        <div>
          <Label className="text-[#8b949e] text-xs">Length (mm)</Label>
          <Input type="number" className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.length} onChange={(e) => set("length", e.target.value)} />
        </div>
        <div>
          <Label className="text-[#8b949e] text-xs">Additional Dimension</Label>
          <Input className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.additional_dimension} onChange={(e) => set("additional_dimension", e.target.value)} />
        </div>
        <div>
          <Label className="text-[#8b949e] text-xs">Mesh Name</Label>
          <Input className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.mesh_name} onChange={(e) => set("mesh_name", e.target.value)} />
        </div>
        <div>
          <Label className="text-[#8b949e] text-xs">Unit / Egység</Label>
          <Select value={form.unit_of_measure} onValueChange={(v) => set("unit_of_measure", v)}>
            <SelectTrigger className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#22272e] border-[#2d333b]">
              <SelectItem value="ton">Ton / Tonna</SelectItem>
              <SelectItem value="piece">Piece / Darab</SelectItem>
              <SelectItem value="meter">Meter / Méter</SelectItem>
              <SelectItem value="kg">Kg</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[#8b949e] text-xs">Conversion Factor</Label>
          <Input type="number" className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.conversion_factor} onChange={(e) => set("conversion_factor", e.target.value)} />
        </div>
        {form.unit_of_measure === "piece" && (
          <div>
            <Label className="text-[#8b949e] text-xs">Piece Weight (kg) *</Label>
            <Input type="number" className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.piece_weight} onChange={(e) => set("piece_weight", e.target.value)} />
          </div>
        )}
        <div>
          <Label className="text-[#8b949e] text-xs">Bundle Weight (kg)</Label>
          <Input type="number" className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.bundle_weight} onChange={(e) => set("bundle_weight", e.target.value)} />
        </div>
        <div>
          <Label className="text-[#8b949e] text-xs">Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#22272e] border-[#2d333b]">
              <SelectItem value="active">Active / Aktív</SelectItem>
              <SelectItem value="inactive">Inactive / Inaktív</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <div>
          {item?.id && (
            <Button variant="ghost" onClick={handleDelete} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2">
              <Trash2 className="w-4 h-4" /> Delete / Törlés
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="border-[#2d333b] text-[#8b949e] hover:bg-[#22272e]">
            Cancel / Mégse
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save / Mentés"}
          </Button>
        </div>
      </div>
    </div>
  );
}
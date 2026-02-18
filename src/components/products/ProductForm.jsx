import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, Trash2 } from "lucide-react";

const fieldClass =
  "bg-white border border-[#D9E1E8] rounded-lg text-slate-800 text-sm placeholder:text-[#9AA6B2] " +
  "focus:border-[#3A7BFF] focus:ring-2 focus:ring-[#3A7BFF]/20 hover:border-[#3A7BFF]/60 transition-colors h-9";

const labelClass = "text-[#2E3A46] text-xs font-semibold mb-1 block";

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
    <div className="rounded-xl shadow-md border border-[#D9E1E8] overflow-hidden" style={{ background: "#F4F6F8" }}>
      {/* Form header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#D9E1E8] bg-white">
        <h3 className="text-sm font-semibold text-[#2E3A46]">
          {item ? "Edit Product / Szerkesztés" : "New Product / Új termék"}
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form body */}
      <div className="p-5 space-y-5">
        {/* Row 1: Category, Factory Code, HS Code (mandatory – emphasized) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
          <div>
            <label className={labelClass}>Category / Kategória <span className="text-red-500">*</span></label>
            <Select value={form.category_id} onValueChange={(v) => {
              const cat = categories.find((c) => c.id === v);
              set("category_id", v);
              set("category_name", cat ? `${cat.name_en} / ${cat.name_hu}` : "");
            }}>
              <SelectTrigger className={fieldClass + " w-full"}>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name_en} / {c.name_hu}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className={labelClass}>Factory Code / Gyári kód</label>
            <Input className={fieldClass + " w-full"} value={form.factory_code} onChange={(e) => set("factory_code", e.target.value)} placeholder="e.g. RA812" />
          </div>

          {/* HS Code – visually emphasized (mandatory) */}
          <div>
            <label className={labelClass + " text-[#1d4ed8]"}>
              HS Code / VTSZ <span className="text-red-500">*</span>
            </label>
            <Input
              className={
                "bg-white border-2 border-[#3A7BFF]/50 rounded-lg text-slate-800 text-sm font-medium " +
                "placeholder:text-[#9AA6B2] focus:border-[#3A7BFF] focus:ring-2 focus:ring-[#3A7BFF]/20 " +
                "hover:border-[#3A7BFF]/80 transition-colors h-9 w-full"
              }
              value={form.hs_code}
              onChange={(e) => set("hs_code", e.target.value)}
              placeholder="e.g. 7214201000"
            />
          </div>
        </div>

        {/* Row 2: Diameter, Length, Additional Dimension */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
          <div>
            <label className={labelClass}>Diameter (mm)</label>
            <Input type="number" className={fieldClass + " w-full"} value={form.diameter} onChange={(e) => set("diameter", e.target.value)} placeholder="e.g. 8" />
          </div>
          <div>
            <label className={labelClass}>Length (mm)</label>
            <Input type="number" className={fieldClass + " w-full"} value={form.length} onChange={(e) => set("length", e.target.value)} placeholder="e.g. 6000" />
          </div>
          <div>
            <label className={labelClass}>Additional Dimension</label>
            <Input className={fieldClass + " w-full"} value={form.additional_dimension} onChange={(e) => set("additional_dimension", e.target.value)} placeholder="e.g. 150x150" />
          </div>
        </div>

        {/* Row 3: Mesh Name, Unit, Piece Weight (conditional) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
          <div>
            <label className={labelClass}>Mesh Name</label>
            <Input className={fieldClass + " w-full"} value={form.mesh_name} onChange={(e) => set("mesh_name", e.target.value)} placeholder="e.g. 4K15/15" />
          </div>
          <div>
            <label className={labelClass}>Unit / Egység</label>
            <Select value={form.unit_of_measure} onValueChange={(v) => set("unit_of_measure", v)}>
              <SelectTrigger className={fieldClass + " w-full"}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ton">Ton / Tonna</SelectItem>
                <SelectItem value="piece">Piece / Darab</SelectItem>
                <SelectItem value="meter">Meter / Méter</SelectItem>
                <SelectItem value="kg">Kg</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.unit_of_measure === "piece" && (
            <div>
              <label className={labelClass}>Piece Weight (kg) <span className="text-red-500">*</span></label>
              <Input type="number" className={fieldClass + " w-full"} value={form.piece_weight} onChange={(e) => set("piece_weight", e.target.value)} placeholder="kg / db" />
            </div>
          )}
        </div>

        {/* Row 4: Bundle Weight + Conversion Factor (same row) + Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
          <div>
            <label className={labelClass}>Bundle Weight (kg)</label>
            <Input type="number" className={fieldClass + " w-full"} value={form.bundle_weight} onChange={(e) => set("bundle_weight", e.target.value)} placeholder="kg / csomag" />
          </div>
          <div>
            <label className={labelClass}>Conversion Factor</label>
            <Input type="number" className={fieldClass + " w-full"} value={form.conversion_factor} onChange={(e) => set("conversion_factor", e.target.value)} placeholder="e.g. 1.0" />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className={fieldClass + " w-full"}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    Active / Aktív
                  </span>
                </SelectItem>
                <SelectItem value="inactive">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                    Inactive / Inaktív
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center px-5 py-3 border-t border-[#D9E1E8] bg-white">
        <div>
          {item?.id && (
            <Button variant="ghost" onClick={handleDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2 text-xs h-8">
              <Trash2 className="w-3.5 h-3.5" /> Delete / Törlés
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-[#F4F6F8] border-[#D9E1E8] text-[#2E3A46] hover:bg-[#e8edf3] text-xs h-8 px-4"
          >
            Cancel / Mégse
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 text-xs h-8 px-4 text-white border-0"
            style={{ background: "#2563eb" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 0 2px #e05a2b55"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
          >
            <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save / Mentés"}
          </Button>
        </div>
      </div>
    </div>
  );
}
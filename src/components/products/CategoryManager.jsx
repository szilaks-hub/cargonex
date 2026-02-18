import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, Trash2 } from "lucide-react";

export default function CategoryManager() {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name_en: "", name_hu: "", description: "", status: "active" });
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.ProductCategory.list(),
  });

  const openForm = (item) => {
    setEditItem(item);
    setForm(item || { name_en: "", name_hu: "", description: "", status: "active" });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (editItem?.id) {
      await base44.entities.ProductCategory.update(editItem.id, form);
    } else {
      await base44.entities.ProductCategory.create(form);
    }
    setSaving(false);
    setShowForm(false);
    setEditItem(null);
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const handleDelete = async () => {
    if (editItem?.id) {
      await base44.entities.ProductCategory.delete(editItem.id);
      setShowForm(false);
      setEditItem(null);
      qc.invalidateQueries({ queryKey: ["categories"] });
    }
  };

  const columns = [
    { header: "Name EN", key: "name_en" },
    { header: "Name HU", key: "name_hu" },
    { header: "Description", key: "description", render: (r) => r.description || "-" },
    { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Categories / Termékkörök"
        subtitle="Product categories / Termék kategóriák"
        onAdd={() => openForm(null)}
        addLabel="New Category / Új kategória"
      />

      {showForm && (
        <div className="rounded-xl shadow-md border border-[#D9E1E8] overflow-hidden" style={{ background: "#F4F6F8" }}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#D9E1E8] bg-white">
            <h3 className="text-sm font-semibold text-[#2E3A46]">
              {editItem ? "Edit Category" : "New Category / Új kategória"}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              <div>
                <label className="text-[#2E3A46] text-xs font-semibold mb-1 block">Name EN <span className="text-red-500">*</span></label>
                <Input className="bg-white border border-[#D9E1E8] rounded-lg text-slate-800 text-sm h-9 placeholder:text-[#9AA6B2] focus:border-[#3A7BFF] focus:ring-2 focus:ring-[#3A7BFF]/20 hover:border-[#3A7BFF]/60 transition-colors" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
              </div>
              <div>
                <label className="text-[#2E3A46] text-xs font-semibold mb-1 block">Name HU <span className="text-red-500">*</span></label>
                <Input className="bg-white border border-[#D9E1E8] rounded-lg text-slate-800 text-sm h-9 placeholder:text-[#9AA6B2] focus:border-[#3A7BFF] focus:ring-2 focus:ring-[#3A7BFF]/20 hover:border-[#3A7BFF]/60 transition-colors" value={form.name_hu} onChange={(e) => setForm({ ...form, name_hu: e.target.value })} />
              </div>
              <div>
                <label className="text-[#2E3A46] text-xs font-semibold mb-1 block">Description</label>
                <Input className="bg-white border border-[#D9E1E8] rounded-lg text-slate-800 text-sm h-9 placeholder:text-[#9AA6B2] focus:border-[#3A7BFF] focus:ring-2 focus:ring-[#3A7BFF]/20 hover:border-[#3A7BFF]/60 transition-colors" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center px-5 py-3 border-t border-[#D9E1E8] bg-white">
            <div>{editItem?.id && <Button variant="ghost" onClick={handleDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2 text-xs h-8"><Trash2 className="w-3.5 h-3.5" /> Delete</Button>}</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="bg-[#F4F6F8] border-[#D9E1E8] text-[#2E3A46] hover:bg-[#e8edf3] text-xs h-8 px-4">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="text-white gap-2 text-xs h-8 px-4" style={{ background: "#2563eb" }}><Save className="w-3.5 h-3.5" /> Save</Button>
            </div>
          </div>
        </div>
      )}

      <DataTable columns={columns} data={categories} isLoading={isLoading} onRowClick={openForm} />
    </div>
  );
}
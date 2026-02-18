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
        <div className="bg-[#1a1e23] border border-[#2d333b] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[#e6edf3]">
              {editItem ? "Edit Category" : "New Category / Új kategória"}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-[#8b949e] hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-[#8b949e] text-xs">Name EN *</Label>
              <Input className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
            </div>
            <div>
              <Label className="text-[#8b949e] text-xs">Name HU *</Label>
              <Input className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.name_hu} onChange={(e) => setForm({ ...form, name_hu: e.target.value })} />
            </div>
            <div>
              <Label className="text-[#8b949e] text-xs">Description</Label>
              <Input className="bg-[#22272e] border-[#2d333b] text-[#e6edf3]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-between pt-2">
            <div>{editItem?.id && <Button variant="ghost" onClick={handleDelete} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2"><Trash2 className="w-4 h-4" /> Delete</Button>}</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="border-[#2d333b] text-[#8b949e]">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white gap-2"><Save className="w-4 h-4" /> Save</Button>
            </div>
          </div>
        </div>
      )}

      <DataTable columns={columns} data={categories} isLoading={isLoading} onRowClick={openForm} />
    </div>
  );
}
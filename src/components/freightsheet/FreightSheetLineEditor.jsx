import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Save } from "lucide-react";
import ZipAutocomplete from "@/components/freightsheet/ZipAutocomplete";

function LineRow({ line, defaultLoad, onSave, onDelete }) {
  const [form, setForm] = useState({ ...line });
  const set = (k, v) => {
    setForm(f => {
      const updated = { ...f, [k]: v };
      const dom = Number(k === "domestic_leg" ? v : updated.domestic_leg) || 0;
      const fgn = Number(k === "foreign_leg" ? v : updated.foreign_leg) || 0;
      const load = Number(k === "load_tons" ? v : updated.load_tons) || defaultLoad || 24;
      updated.total_price = dom + fgn;
      updated.eur_per_ton = load > 0 ? parseFloat(((dom + fgn) / load).toFixed(4)) : 0;
      return updated;
    });
  };

  const inp = "h-8 text-xs bg-white border-[#c6ccda] text-slate-800 px-2";

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-2 py-1.5"><Input className={inp} value={form.destination_zip || ""} onChange={e => set("destination_zip", e.target.value)} placeholder="ISZ" /></td>
      <td className="px-2 py-1.5"><Input className={inp} value={form.destination_city || ""} onChange={e => set("destination_city", e.target.value)} placeholder="Város *" /></td>
      <td className="px-2 py-1.5"><Input className={inp} value={form.destination_county || ""} onChange={e => set("destination_county", e.target.value)} placeholder="Vármegye" /></td>
      <td className="px-2 py-1.5"><Input className={inp} value={form.destination_region || ""} onChange={e => set("destination_region", e.target.value)} placeholder="Régió" /></td>
      <td className="px-2 py-1.5"><Input type="number" className={inp} value={form.domestic_leg || ""} onChange={e => set("domestic_leg", e.target.value)} placeholder="0" /></td>
      <td className="px-2 py-1.5"><Input type="number" className={inp} value={form.foreign_leg || ""} onChange={e => set("foreign_leg", e.target.value)} placeholder="0" /></td>
      <td className="px-2 py-1.5 text-xs text-slate-600 font-medium text-right">{(form.total_price || 0).toLocaleString("hu-HU", { minimumFractionDigits: 0 })}</td>
      <td className="px-2 py-1.5"><Input type="number" className={inp} value={form.load_tons || ""} onChange={e => set("load_tons", e.target.value)} placeholder={`${defaultLoad}`} /></td>
      <td className="px-2 py-1.5 text-xs text-orange-600 font-semibold text-right">{(form.eur_per_ton || 0).toFixed(2)}</td>
      <td className="px-2 py-1.5 text-center">
        <Checkbox checked={form.is_active !== false} onCheckedChange={v => set("is_active", v)} />
      </td>
      <td className="px-2 py-1.5 flex gap-1">
        <button onClick={() => onSave(form)} className="text-blue-500 hover:text-blue-700"><Save className="w-3.5 h-3.5" /></button>
        <button onClick={() => onDelete(line.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
      </td>
    </tr>
  );
}

function NewLineRow({ sheetId, defaultLoad, onSaved }) {
  const [form, setForm] = useState({ destination_zip: "", destination_city: "", destination_county: "", destination_region: "", domestic_leg: "", foreign_leg: "", load_tons: "", is_active: true });
  const set = (k, v) => {
    setForm(f => {
      const updated = { ...f, [k]: v };
      const dom = Number(k === "domestic_leg" ? v : updated.domestic_leg) || 0;
      const fgn = Number(k === "foreign_leg" ? v : updated.foreign_leg) || 0;
      const load = Number(k === "load_tons" ? v : updated.load_tons) || defaultLoad || 24;
      updated.total_price = dom + fgn;
      updated.eur_per_ton = load > 0 ? parseFloat(((dom + fgn) / load).toFixed(4)) : 0;
      return updated;
    });
  };

  const handleAdd = async () => {
    if (!form.destination_city) return;
    const data = {
      ...form,
      sheet_id: sheetId,
      domestic_leg: Number(form.domestic_leg) || 0,
      foreign_leg: Number(form.foreign_leg) || 0,
      load_tons: form.load_tons ? Number(form.load_tons) : undefined,
      total_price: (Number(form.domestic_leg) || 0) + (Number(form.foreign_leg) || 0),
    };
    const load = data.load_tons || defaultLoad || 24;
    data.eur_per_ton = load > 0 ? parseFloat((data.total_price / load).toFixed(4)) : 0;
    await base44.entities.FreightSheetLine.create(data);
    setForm({ destination_zip: "", destination_city: "", destination_county: "", destination_region: "", domestic_leg: "", foreign_leg: "", load_tons: "", is_active: true });
    onSaved();
  };

  const inp = "h-8 text-xs bg-blue-50 border-blue-200 text-slate-800 px-2";

  return (
    <tr className="border-b border-blue-100 bg-blue-50/30">
      <td className="px-2 py-1.5"><Input className={inp} value={form.destination_zip} onChange={e => set("destination_zip", e.target.value)} placeholder="ISZ" /></td>
      <td className="px-2 py-1.5"><Input className={inp} value={form.destination_city} onChange={e => set("destination_city", e.target.value)} placeholder="Város *" /></td>
      <td className="px-2 py-1.5"><Input className={inp} value={form.destination_county} onChange={e => set("destination_county", e.target.value)} placeholder="Vármegye" /></td>
      <td className="px-2 py-1.5"><Input className={inp} value={form.destination_region} onChange={e => set("destination_region", e.target.value)} placeholder="Régió" /></td>
      <td className="px-2 py-1.5"><Input type="number" className={inp} value={form.domestic_leg} onChange={e => set("domestic_leg", e.target.value)} placeholder="0" /></td>
      <td className="px-2 py-1.5"><Input type="number" className={inp} value={form.foreign_leg} onChange={e => set("foreign_leg", e.target.value)} placeholder="0" /></td>
      <td className="px-2 py-1.5 text-xs text-slate-500 font-medium text-right">{((Number(form.domestic_leg) || 0) + (Number(form.foreign_leg) || 0)).toLocaleString()}</td>
      <td className="px-2 py-1.5"><Input type="number" className={inp} value={form.load_tons} onChange={e => set("load_tons", e.target.value)} placeholder={`${defaultLoad}`} /></td>
      <td className="px-2 py-1.5 text-xs text-orange-600 font-semibold text-right">{(form.eur_per_ton || 0).toFixed(2)}</td>
      <td className="px-2 py-1.5 text-center"><Checkbox checked={form.is_active} onCheckedChange={v => set("is_active", v)} /></td>
      <td className="px-2 py-1.5">
        <button onClick={handleAdd} className="text-green-600 hover:text-green-800"><Plus className="w-4 h-4" /></button>
      </td>
    </tr>
  );
}

export default function FreightSheetLineEditor({ sheet }) {
  const qc = useQueryClient();

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ["sheetLines", sheet.id],
    queryFn: () => base44.entities.FreightSheetLine.filter({ sheet_id: sheet.id }, "sort_order"),
  });

  const handleSave = async (line) => {
    const data = {
      ...line,
      domestic_leg: Number(line.domestic_leg) || 0,
      foreign_leg: Number(line.foreign_leg) || 0,
      load_tons: line.load_tons ? Number(line.load_tons) : undefined,
    };
    const load = data.load_tons || sheet.default_load_tons || 24;
    data.total_price = (data.domestic_leg || 0) + (data.foreign_leg || 0);
    data.eur_per_ton = load > 0 ? parseFloat((data.total_price / load).toFixed(4)) : 0;
    await base44.entities.FreightSheetLine.update(line.id, data);
    qc.invalidateQueries({ queryKey: ["sheetLines", sheet.id] });
  };

  const handleDelete = async (id) => {
    await base44.entities.FreightSheetLine.delete(id);
    qc.invalidateQueries({ queryKey: ["sheetLines", sheet.id] });
  };

  const onSaved = () => qc.invalidateQueries({ queryKey: ["sheetLines", sheet.id] });

  const thCls = "px-2 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className={thCls}>ISZ</th>
            <th className={thCls}>Város *</th>
            <th className={thCls}>Vármegye</th>
            <th className={thCls}>Régió</th>
            <th className={thCls}>Belföld (határig)</th>
            <th className={thCls}>Külföld (határtól)</th>
            <th className={`${thCls} text-right`}>Összesen</th>
            <th className={thCls}>Kiterh. (t)</th>
            <th className={`${thCls} text-right`}>EUR/to</th>
            <th className={`${thCls} text-center`}>Aktív</th>
            <th className={thCls}></th>
          </tr>
        </thead>
        <tbody>
          {lines.map(line => (
            <LineRow key={line.id} line={line} defaultLoad={sheet.default_load_tons} onSave={handleSave} onDelete={handleDelete} />
          ))}
          {isLoading && (
            <tr><td colSpan={11} className="text-center py-4 text-slate-400 text-xs">Loading...</td></tr>
          )}
          <NewLineRow sheetId={sheet.id} defaultLoad={sheet.default_load_tons} onSaved={onSaved} />
        </tbody>
      </table>
    </div>
  );
}
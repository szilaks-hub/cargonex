import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Save } from "lucide-react";

function LineRow({ line, defaultLoad, onSave, onDelete }) {
  const [form, setForm] = useState({
    destination_zip: line.destination_zip || "",
    destination_city: line.destination_city || "",
    destination_county: line.destination_county || "",
    destination_region: line.destination_region || "",
    foreign_leg_price: line.foreign_leg_price ?? "",
    domestic_leg_price: line.domestic_leg_price ?? "",
    load_tons: line.load_tons ?? "",
    is_active: line.is_active !== false,
  });
  const [dirty, setDirty] = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };

  const foreign = Number(form.foreign_leg_price) || 0;
  const domestic = Number(form.domestic_leg_price) || 0;
  const total = foreign + domestic;
  const load = Number(form.load_tons) || defaultLoad || 24;
  const eurPerTon = load > 0 ? (total / load).toFixed(2) : "-";

  const handleSave = () => {
    onSave(line.id, {
      ...form,
      foreign_leg_price: Number(form.foreign_leg_price) || 0,
      domestic_leg_price: Number(form.domestic_leg_price) || 0,
      load_tons: form.load_tons !== "" ? Number(form.load_tons) : undefined,
      total_price: total,
      eur_per_ton: load > 0 ? total / load : 0,
    });
    setDirty(false);
  };

  const inp = "h-8 bg-white border-[#c6ccda] text-slate-800 text-xs px-2";

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50">
      <td className="p-1.5"><Input className={inp} value={form.destination_zip} onChange={e => set("destination_zip", e.target.value)} placeholder="ISZ" /></td>
      <td className="p-1.5"><Input className={inp} value={form.destination_city} onChange={e => set("destination_city", e.target.value)} placeholder="Város *" /></td>
      <td className="p-1.5"><Input className={inp} value={form.destination_county} onChange={e => set("destination_county", e.target.value)} placeholder="Vármegye" /></td>
      <td className="p-1.5"><Input className={inp} value={form.destination_region} onChange={e => set("destination_region", e.target.value)} placeholder="Régió" /></td>
      <td className="p-1.5"><Input type="number" className={inp} value={form.foreign_leg_price} onChange={e => set("foreign_leg_price", e.target.value)} placeholder="0" /></td>
      <td className="p-1.5"><Input type="number" className={inp} value={form.domestic_leg_price} onChange={e => set("domestic_leg_price", e.target.value)} placeholder="0" /></td>
      <td className="p-1.5 text-center">
        <span className="text-xs font-semibold text-blue-600">{total > 0 ? total.toLocaleString() : "-"}</span>
      </td>
      <td className="p-1.5"><Input type="number" className={inp} value={form.load_tons} onChange={e => set("load_tons", e.target.value)} placeholder={defaultLoad} /></td>
      <td className="p-1.5 text-center">
        <span className="text-xs font-semibold text-orange-600">{eurPerTon}</span>
      </td>
      <td className="p-1.5">
        <div className="flex gap-1">
          {dirty && (
            <button onClick={handleSave} className="p-1 text-blue-500 hover:text-blue-700" title="Save">
              <Save className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => onDelete(line.id)} className="p-1 text-red-400 hover:text-red-600" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function FreightSheetLineEditor({ sheet }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newLine, setNewLine] = useState({ destination_zip: "", destination_city: "", destination_county: "", destination_region: "", foreign_leg_price: "", domestic_leg_price: "", load_tons: "" });

  const { data: lines = [] } = useQuery({
    queryKey: ["sheetLines", sheet.id],
    queryFn: () => base44.entities.FreightSheetLine.filter({ sheet_id: sheet.id }, "sort_order"),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["sheetLines", sheet.id] });

  const handleUpdate = async (id, data) => {
    await base44.entities.FreightSheetLine.update(id, data);
    refresh();
  };

  const handleDelete = async (id) => {
    await base44.entities.FreightSheetLine.delete(id);
    refresh();
  };

  const setN = (k, v) => setNewLine(f => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    const foreign = Number(newLine.foreign_leg_price) || 0;
    const domestic = Number(newLine.domestic_leg_price) || 0;
    const total = foreign + domestic;
    const load = Number(newLine.load_tons) || sheet.default_load_tons || 24;
    await base44.entities.FreightSheetLine.create({
      sheet_id: sheet.id,
      ...newLine,
      foreign_leg_price: foreign,
      domestic_leg_price: domestic,
      load_tons: newLine.load_tons !== "" ? Number(newLine.load_tons) : undefined,
      total_price: total,
      eur_per_ton: load > 0 ? total / load : 0,
      sort_order: lines.length,
      is_active: true,
    });
    setNewLine({ destination_zip: "", destination_city: "", destination_county: "", destination_region: "", foreign_leg_price: "", domestic_leg_price: "", load_tons: "" });
    setAdding(false);
    refresh();
  };

  const inp = "h-8 bg-white border-[#c6ccda] text-slate-800 text-xs px-2";
  const defaultLoad = sheet.default_load_tons || 24;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Destination Lines / Célhely sorok ({lines.length})</p>
        <Button size="sm" onClick={() => setAdding(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 gap-1">
          <Plus className="w-3 h-3" /> Add Row
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-xs min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {["ISZ", "Város *", "Vármegye", "Régió", "Határig (Foreign)", "Határtól (Domestic)", "Összesen", `Kit. t (def:${defaultLoad})`, "EUR/to", ""].map(h => (
                <th key={h} className="text-left p-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map(line => (
              <LineRow key={line.id} line={line} defaultLoad={defaultLoad} onSave={handleUpdate} onDelete={handleDelete} />
            ))}
            {adding && (
              <tr className="border-b border-blue-100 bg-blue-50/40">
                <td className="p-1.5"><Input className={inp} value={newLine.destination_zip} onChange={e => setN("destination_zip", e.target.value)} placeholder="ISZ" /></td>
                <td className="p-1.5"><Input className={inp} value={newLine.destination_city} onChange={e => setN("destination_city", e.target.value)} placeholder="Város *" /></td>
                <td className="p-1.5"><Input className={inp} value={newLine.destination_county} onChange={e => setN("destination_county", e.target.value)} placeholder="Vármegye" /></td>
                <td className="p-1.5"><Input className={inp} value={newLine.destination_region} onChange={e => setN("destination_region", e.target.value)} placeholder="Régió" /></td>
                <td className="p-1.5"><Input type="number" className={inp} value={newLine.foreign_leg_price} onChange={e => setN("foreign_leg_price", e.target.value)} placeholder="0" /></td>
                <td className="p-1.5"><Input type="number" className={inp} value={newLine.domestic_leg_price} onChange={e => setN("domestic_leg_price", e.target.value)} placeholder="0" /></td>
                <td className="p-1.5 text-center">
                  <span className="text-xs font-semibold text-blue-600">
                    {(Number(newLine.foreign_leg_price) || 0) + (Number(newLine.domestic_leg_price) || 0) || "-"}
                  </span>
                </td>
                <td className="p-1.5"><Input type="number" className={inp} value={newLine.load_tons} onChange={e => setN("load_tons", e.target.value)} placeholder={defaultLoad} /></td>
                <td className="p-1.5 text-center">
                  <span className="text-xs text-orange-600 font-semibold">
                    {(() => {
                      const t = (Number(newLine.foreign_leg_price)||0) + (Number(newLine.domestic_leg_price)||0);
                      const l = Number(newLine.load_tons) || defaultLoad;
                      return t > 0 && l > 0 ? (t / l).toFixed(2) : "-";
                    })()}
                  </span>
                </td>
                <td className="p-1.5">
                  <div className="flex gap-1">
                    <button onClick={handleAdd} className="p-1 text-emerald-600 hover:text-emerald-800" title="Add"><Save className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setAdding(false)} className="p-1 text-slate-400 hover:text-slate-600" title="Cancel"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            )}
            {lines.length === 0 && !adding && (
              <tr><td colSpan={10} className="text-center text-slate-400 text-xs py-6">No lines yet – click "Add Row" to start</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
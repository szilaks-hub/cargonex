import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Save, Copy } from "lucide-react";
import HuLocationSearch from "@/components/ui/HuLocationSearch";

function calcTotals(form, defaultLoad) {
  const dom = Number(form.domestic_leg) || 0;
  const fgn = Number(form.foreign_leg) || 0;
  const load = Number(form.load_tons) || defaultLoad || 24;
  return {
    total_price: dom + fgn,
    eur_per_ton: load > 0 ? parseFloat(((dom + fgn) / load).toFixed(4)) : 0,
  };
}

function DestinationFields({ form, set, isHU, inp, readonly = false }) {
  if (readonly) {
    return (
      <td colSpan={2} className="px-2 py-1.5">
        <div className="text-xs text-slate-700">
          {form.destination_zip && <span className="font-mono text-slate-500 mr-1">{form.destination_zip}</span>}
          <span className="font-medium">{form.destination_city || "—"}</span>
          {(form.destination_county || form.destination_region) && (
            <span className="text-slate-400 ml-1">· {form.destination_county || form.destination_region}</span>
          )}
        </div>
      </td>
    );
  }

  if (isHU) {
    return (
      <td colSpan={2} className="px-2 py-1.5">
        <HuLocationSearch
          zip={form.destination_zip || ""}
          city={form.destination_city || ""}
          county={form.destination_county || ""}
          inputClassName={inp}
          onChange={({ zip, city, county }) => {
            set("destination_zip", zip);
            set("destination_city", city);
            set("destination_county", county);
          }}
        />
      </td>
    );
  }

  // Non-HU: zip optional, city mandatory, region optional
  return (
    <td colSpan={2} className="px-2 py-1.5">
      <div className="flex gap-1">
        <Input className={`${inp} w-20`} value={form.destination_zip || ""} onChange={e => set("destination_zip", e.target.value)} placeholder="ZIP" />
        <Input className={`${inp} flex-1`} value={form.destination_city || ""} onChange={e => set("destination_city", e.target.value)} placeholder="City *" />
        <Input className={`${inp} w-24`} value={form.destination_region || ""} onChange={e => set("destination_region", e.target.value)} placeholder="Régió" />
      </div>
    </td>
  );
}

function LineRow({ line, defaultLoad, onSave, onDelete, onDuplicate, isHU, readonly = false }) {
  const [form, setForm] = useState({ ...line });
  const set = (k, v) => setForm(f => {
    const updated = { ...f, [k]: v };
    const { total_price, eur_per_ton } = calcTotals({ ...updated }, defaultLoad);
    return { ...updated, total_price, eur_per_ton };
  });

  const inp = "h-8 text-xs bg-white border-[#c6ccda] text-slate-800 px-2";

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <DestinationFields form={form} set={set} isHU={isHU} inp={inp} readonly={readonly} />
      <td className="px-2 py-1.5"><Input type="number" className={inp} value={form.domestic_leg || ""} onChange={e => set("domestic_leg", e.target.value)} placeholder="Határtól" readOnly={readonly} /></td>
      <td className="px-2 py-1.5"><Input type="number" className={inp} value={form.foreign_leg || ""} onChange={e => set("foreign_leg", e.target.value)} placeholder="Határig" readOnly={readonly} /></td>
      <td className="px-2 py-1.5 text-xs text-slate-600 font-medium text-right">{(form.total_price || 0).toLocaleString("hu-HU")}</td>
      <td className="px-2 py-1.5"><Input type="number" className={inp} value={form.load_tons || ""} onChange={e => set("load_tons", e.target.value)} placeholder={`${defaultLoad}`} readOnly={readonly} /></td>
      <td className="px-2 py-1.5 text-xs text-orange-600 font-semibold text-right">{(form.eur_per_ton || 0).toFixed(2)}</td>
      <td className="px-2 py-1.5 text-center">
        <Checkbox checked={form.is_active !== false} onCheckedChange={v => !readonly && set("is_active", v)} disabled={readonly} />
      </td>
      <td className="px-2 py-1.5">
        <div className="flex gap-1 items-center">
          {!readonly && (
            <>
              <button onClick={() => onSave(form)} className="text-blue-500 hover:text-blue-700" title="Save"><Save className="w-3.5 h-3.5" /></button>
              <button onClick={() => onDuplicate(form)} className="text-slate-400 hover:text-indigo-600" title="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
              <button onClick={() => onDelete(line.id)} className="text-red-400 hover:text-red-600" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function NewLineRow({ sheetId, defaultLoad, isHU, onSaved }) {
  const emptyForm = { destination_zip: "", destination_city: "", destination_county: "", destination_region: "", domestic_leg: "", foreign_leg: "", load_tons: "", is_active: true };
  const [form, setForm] = useState(emptyForm);

  const set = (k, v) => setForm(f => {
    const updated = { ...f, [k]: v };
    const { total_price, eur_per_ton } = calcTotals(updated, defaultLoad);
    return { ...updated, total_price, eur_per_ton };
  });

  const handleAdd = async () => {
    if (!form.destination_city) return;
    const data = {
      ...form,
      sheet_id: sheetId,
      domestic_leg: Number(form.domestic_leg) || 0,
      foreign_leg: Number(form.foreign_leg) || 0,
      load_tons: form.load_tons ? Number(form.load_tons) : undefined,
    };
    const { total_price, eur_per_ton } = calcTotals(data, defaultLoad);
    await base44.entities.FreightSheetLine.create({ ...data, total_price, eur_per_ton });
    setForm(emptyForm);
    onSaved();
  };

  const inp = "h-8 text-xs bg-blue-50 border-blue-200 text-slate-800 px-2";
  const total = (Number(form.domestic_leg) || 0) + (Number(form.foreign_leg) || 0);
  const load = Number(form.load_tons) || defaultLoad || 24;

  return (
    <tr className="border-b border-blue-100 bg-blue-50/30">
      <DestinationFields form={form} set={set} isHU={isHU} inp={inp} />
      <td className="px-2 py-1.5"><Input type="number" className={inp} value={form.domestic_leg} onChange={e => set("domestic_leg", e.target.value)} placeholder="0" /></td>
      <td className="px-2 py-1.5"><Input type="number" className={inp} value={form.foreign_leg} onChange={e => set("foreign_leg", e.target.value)} placeholder="0" /></td>
      <td className="px-2 py-1.5 text-xs text-slate-500 font-medium text-right">{total.toLocaleString()}</td>
      <td className="px-2 py-1.5"><Input type="number" className={inp} value={form.load_tons} onChange={e => set("load_tons", e.target.value)} placeholder={`${defaultLoad}`} /></td>
      <td className="px-2 py-1.5 text-xs text-orange-600 font-semibold text-right">{load > 0 ? (total / load).toFixed(2) : "0.00"}</td>
      <td className="px-2 py-1.5 text-center"><Checkbox checked={form.is_active} onCheckedChange={v => set("is_active", v)} /></td>
      <td className="px-2 py-1.5">
        <button onClick={handleAdd} className="text-green-600 hover:text-green-800" title="Add line"><Plus className="w-4 h-4" /></button>
      </td>
    </tr>
  );
}

export default function FreightSheetLineEditor({ sheet, readonly = false }) {
  const qc = useQueryClient();
  const isHU = sheet.destination_country === "HU";

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
    const { total_price, eur_per_ton } = calcTotals(data, sheet.default_load_tons);
    await base44.entities.FreightSheetLine.update(line.id, { ...data, total_price, eur_per_ton });
    qc.invalidateQueries({ queryKey: ["sheetLines", sheet.id] });
  };

  const handleDelete = async (id) => {
    await base44.entities.FreightSheetLine.delete(id);
    qc.invalidateQueries({ queryKey: ["sheetLines", sheet.id] });
  };

  const handleDuplicate = async (line) => {
    const { id, created_date, updated_date, created_by, ...rest } = line;
    await base44.entities.FreightSheetLine.create({ ...rest, sheet_id: sheet.id });
    qc.invalidateQueries({ queryKey: ["sheetLines", sheet.id] });
  };

  const onSaved = () => qc.invalidateQueries({ queryKey: ["sheetLines", sheet.id] });

  const thCls = "px-2 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className={thCls} colSpan={2}>{isHU ? "Helyszín (ISZ / Város / Vármegye)" : "Helyszín (City / ZIP / Régió)"}</th>
            <th className={thCls}>Belföld Határtól</th>
            <th className={thCls}>Külföld Határig</th>
            <th className={`${thCls} text-right`}>Összesen</th>
            <th className={thCls}>Kiterh. (t)</th>
            <th className={`${thCls} text-right`}>EUR/to</th>
            <th className={`${thCls} text-center`}>Aktív</th>
            <th className={thCls}></th>
          </tr>
        </thead>
        <tbody>
          {lines.map(line => (
            <LineRow
              key={line.id}
              line={line}
              defaultLoad={sheet.default_load_tons}
              onSave={handleSave}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              isHU={isHU}
              readonly={readonly}
            />
          ))}
          {isLoading && (
            <tr><td colSpan={10} className="text-center py-4 text-slate-400 text-xs">Betöltés...</td></tr>
          )}
          {!lines.length && !isLoading && (
            <tr><td colSpan={10} className="text-center py-4 text-slate-400 text-xs">
              {readonly ? "Nincs sor." : "Nincs sor. Add hozzá az első lerakót alul!"}
            </td></tr>
          )}
          {!readonly && (
            <NewLineRow sheetId={sheet.id} defaultLoad={sheet.default_load_tons} isHU={isHU} onSaved={onSaved} />
          )}
        </tbody>
      </table>
      {!readonly && (
        <div className="px-4 py-2 bg-blue-50/50 border-t border-blue-100 text-[10px] text-blue-400">
          💡 Az utolsó sor (kék háttér) az új lerakó beviteli sora. Töltsd ki, majd kattints a <strong>+</strong> ikonra.
          {" "}Mentés soronként a <strong>💾</strong> ikonnal, másolás a <strong>⧉</strong> ikonnal.
        </div>
      )}
    </div>
  );
}
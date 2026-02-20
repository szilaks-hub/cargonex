import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

const fmt2 = (n) =>
  typeof n === "number"
    ? n.toLocaleString("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0,00";

const fmtEur = (n) => `${fmt2(n)} EUR`;

export default function OrderbookDapCalc({ byCategory, trucks, openOrderIds }) {
  // Global cost inputs (per ton defaults, user can override)
  const [freightPerTon, setFreightPerTon] = useState("");
  const [customsPerTruck, setCustomsPerTruck] = useState("");
  const [truckCapacity, setTruckCapacity] = useState("24");
  const [otherPerTon, setOtherPerTon] = useState("");

  // Derive average freight from truck data if available
  const avgFreightFromTrucks = useMemo(() => {
    const relevant = trucks.filter(
      (t) => openOrderIds.includes(t.orderbook_id) && t.freight_eur_per_ton_snapshot > 0
    );
    if (!relevant.length) return null;
    const sum = relevant.reduce((s, t) => s + (t.freight_eur_per_ton_snapshot || 0), 0);
    return sum / relevant.length;
  }, [trucks, openOrderIds]);

  const avgCustomsFromTrucks = useMemo(() => {
    const relevant = trucks.filter(
      (t) => openOrderIds.includes(t.orderbook_id) && t.customs_agent_fee > 0
    );
    if (!relevant.length) return null;
    const sum = relevant.reduce((s, t) => s + (t.customs_agent_fee || 0), 0);
    return sum / relevant.length;
  }, [trucks, openOrderIds]);

  const cap = parseFloat(truckCapacity) || 24;
  const freightEurTon = parseFloat(freightPerTon) || avgFreightFromTrucks || 0;
  const customsEurTruck = parseFloat(customsPerTruck) || avgCustomsFromTrucks || 0;
  const customsEurTon = cap > 0 ? customsEurTruck / cap : 0;
  const otherEurTon = parseFloat(otherPerTon) || 0;
  const totalAddedCost = freightEurTon + customsEurTon + otherEurTon;

  const rows = byCategory.map((cat) => {
    const dapPrice = cat.avgPrice + totalAddedCost;
    const dapTotal = cat.orderedTons * dapPrice;
    return { ...cat, dapPrice, dapTotal };
  });

  const grandDap = rows.reduce((s, r) => s + r.dapTotal, 0);
  const grandOrdered = rows.reduce((s, r) => s + r.orderedTons, 0);

  return (
    <Card className="overflow-hidden border-violet-200">
      <div className="bg-gradient-to-r from-violet-700 to-violet-800 px-5 py-3 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-white text-sm">DAP Kalkulátor / Valós bekerülési ár</h3>
          <p className="text-violet-300 text-xs mt-0.5">Beszerzési ár + Fuvardíj + Vámkezelés + Egyéb = DAP EUR/t</p>
        </div>
        <Badge className="bg-violet-600 text-violet-100 text-xs">Termékcsoportonként</Badge>
      </div>

      {/* Cost inputs */}
      <div className="px-5 py-4 bg-violet-50 border-b border-violet-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <CostInput
            label="Fuvardíj (EUR/t)"
            value={freightPerTon}
            onChange={setFreightPerTon}
            placeholder={avgFreightFromTrucks ? `Auto: ${fmt2(avgFreightFromTrucks)}` : "pl. 45,00"}
            hint={avgFreightFromTrucks ? `Átlag a fuvarokból: ${fmt2(avgFreightFromTrucks)} EUR/t` : null}
          />
          <CostInput
            label="Vámkezelés (EUR/kamion)"
            value={customsPerTruck}
            onChange={setCustomsPerTruck}
            placeholder={avgCustomsFromTrucks ? `Auto: ${fmt2(avgCustomsFromTrucks)}` : "pl. 280,00"}
            hint={avgCustomsFromTrucks ? `Átlag: ${fmt2(avgCustomsFromTrucks)} EUR/kamion` : null}
          />
          <CostInput
            label="Kamion kapacitás (t)"
            value={truckCapacity}
            onChange={setTruckCapacity}
            placeholder="24"
            hint={`Vám/t: ${fmt2(customsEurTon)} EUR`}
          />
          <CostInput
            label="Egyéb ktg. (EUR/t)"
            value={otherPerTon}
            onChange={setOtherPerTon}
            placeholder="0,00"
            hint={null}
          />
        </div>

        {/* Cost breakdown summary */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <CostPill label="Fuvardíj" value={fmtEur(freightEurTon)} color="bg-blue-100 text-blue-800" />
          <CostPill label="Vám/t" value={fmtEur(customsEurTon)} color="bg-orange-100 text-orange-800" />
          <CostPill label="Egyéb/t" value={fmtEur(otherEurTon)} color="bg-slate-100 text-slate-700" />
          <div className="ml-auto flex items-center gap-1.5 font-bold text-violet-800 bg-violet-100 px-3 py-1 rounded-full">
            Összes pótköltség: {fmtEur(totalAddedCost)} / t
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="text-left px-4 py-2.5 text-slate-500 font-semibold">Termékcsoport</th>
              <th className="text-right px-4 py-2.5 text-slate-500 font-semibold">Rendelt (t)</th>
              <th className="text-right px-4 py-2.5 text-slate-500 font-semibold">Besz. ár (EUR/t)</th>
              <th className="text-right px-4 py-2.5 text-blue-600 font-semibold">+ Fuvardíj</th>
              <th className="text-right px-4 py-2.5 text-orange-600 font-semibold">+ Vám/t</th>
              <th className="text-right px-4 py-2.5 text-slate-500 font-semibold">+ Egyéb</th>
              <th className="text-right px-4 py-2.5 text-violet-700 font-semibold">DAP ár (EUR/t)</th>
              <th className="text-right px-4 py-2.5 text-violet-700 font-semibold">DAP Összes érték</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((cat, i) => (
              <tr key={cat.category} className={`border-b hover:bg-violet-50/40 ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}>
                <td className="px-4 py-3 font-semibold text-slate-800">{cat.category}</td>
                <td className="px-4 py-3 text-right text-slate-700">{fmt2(cat.orderedTons)}</td>
                <td className="px-4 py-3 text-right text-slate-700">{fmt2(cat.avgPrice)}</td>
                <td className="px-4 py-3 text-right text-blue-700">+{fmt2(freightEurTon)}</td>
                <td className="px-4 py-3 text-right text-orange-700">+{fmt2(customsEurTon)}</td>
                <td className="px-4 py-3 text-right text-slate-500">+{fmt2(otherEurTon)}</td>
                <td className="px-4 py-3 text-right">
                  <span className="font-bold text-violet-800 bg-violet-100 px-2 py-0.5 rounded">
                    {fmt2(cat.dapPrice)} EUR/t
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-bold text-violet-900">
                  {fmtEur(cat.dapTotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-violet-50 border-t-2 border-violet-300 font-bold">
              <td className="px-4 py-3 text-xs uppercase tracking-wide text-violet-900">ÖSSZESEN</td>
              <td className="px-4 py-3 text-right text-violet-900">{fmt2(grandOrdered)} t</td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3 text-right text-violet-700 text-xs">
                Átlag: {fmt2(grandOrdered > 0 ? grandDap / grandOrdered : 0)} EUR/t
              </td>
              <td className="px-4 py-3 text-right text-violet-900 text-sm">{fmtEur(grandDap)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="px-5 py-2.5 bg-violet-50 border-t border-violet-100 flex items-center gap-1.5 text-[11px] text-violet-600">
        <Info className="w-3 h-3" />
        A fuvardíj és vámkezelés automatikusan kitöltődik a fuvarokból ha rögzítve van. Manuálisan felülírható.
      </div>
    </Card>
  );
}

function CostInput({ label, value, onChange, placeholder, hint }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-slate-600 block mb-1">{label}</label>
      <Input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-xs bg-white"
      />
      {hint && <div className="text-[10px] text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
}

function CostPill({ label, value, color }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${color}`}>
      <span className="font-medium">{label}:</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
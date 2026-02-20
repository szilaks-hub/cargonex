import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calculator, TrendingUp, Globe, Printer } from "lucide-react";

const fmt2 = (n, d = 2) =>
  typeof n === "number"
    ? n.toLocaleString("hu-HU", { minimumFractionDigits: d, maximumFractionDigits: d })
    : "—";

const COUNTRY_NAMES = {
  HU: "Magyarország", DE: "Németország", AT: "Ausztria", SK: "Szlovákia",
  CZ: "Csehország", RO: "Románia", PL: "Lengyelország", HR: "Horvátország",
  SI: "Szlovénia", RS: "Szerbia", BG: "Bulgária", IT: "Olaszország",
  FR: "Franciaország", NL: "Hollandia", BE: "Belgium", CH: "Svájc",
  GB: "Nagy-Britannia", UA: "Ukrajna", TR: "Törökország",
};

export default function FreightSheetAnalysis() {
  // Simulation inputs
  const [purchasePrice, setPurchasePrice] = useState("");
  const [customs, setCustoms] = useState("");
  const [other, setOther] = useState("");
  const [otherFreight, setOtherFreight] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [profitPct, setProfitPct] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterCarrier, setFilterCarrier] = useState("");
  const [filterOrigin, setFilterOrigin] = useState("");

  const { data: sheets = [] } = useQuery({
    queryKey: ["freightSheets"],
    queryFn: () => base44.entities.FreightSheet.list("-valid_from"),
  });

  const { data: lines = [] } = useQuery({
    queryKey: ["allFreightLines"],
    queryFn: () => base44.entities.FreightSheetLine.list(),
  });

  // Only active sheets
  const activeSheets = sheets.filter(s => s.status === "active");

  // Group lines by destination country
  const byCountry = useMemo(() => {
    const map = {};
    lines.forEach(line => {
      const sheet = sheets.find(s => s.id === line.sheet_id);
      if (!sheet || sheet.status !== "active") return;
      const country = sheet.destination_country || "?";
      if (!map[country]) map[country] = [];
      map[country].push({ line, sheet });
    });
    return map;
  }, [lines, sheets]);

  // Simulation values
  const pp = parseFloat(purchasePrice) || 0;
  const cu = parseFloat(customs) || 0;
  const ot = parseFloat(other) || 0;
  const of_ = parseFloat(otherFreight) || 0;
  const wh = parseFloat(warehouse) || 0;
  const prof = parseFloat(profitPct) || 0;

  // Build table rows: one per destination city/zip, lowest freight per country
  const tableRows = useMemo(() => {
    const rows = [];
    Object.entries(byCountry).forEach(([country, items]) => {
      if (filterCountry && country !== filterCountry) return;
      items.forEach(({ line, sheet }) => {
        const freight = (line.total_price || 0) + of_;
        const loadTons = line.load_tons || sheet.default_load_tons || 24;
        const freightPerTon = loadTons > 0 ? freight / loadTons : 0;
        const customsPerTon = cu; // EUR/t direct
        const totalCost = pp + freightPerTon + customsPerTon + ot + wh;
        const profitAmt = totalCost * (prof / 100);
        const sellingPrice = totalCost + profitAmt;
        rows.push({
          country,
          countryName: COUNTRY_NAMES[country] || country,
          city: line.destination_city || line.destination_zip || "—",
          zip: line.destination_zip,
          county: line.destination_county || line.destination_region || "",
          carrier: sheet.carrier_name || "—",
          freightDomestic: line.domestic_leg || 0,
          freightForeign: line.foreign_leg || 0,
          freight: freight,
          loadTons,
          freightPerTon,
          totalCost,
          sellingPrice,
          profitAmt,
          sheetNumber: sheet.sheet_number,
        });
      });
    });
    return rows
      .filter(r => !filterCarrier || r.carrier === filterCarrier)
      .sort((a, b) => a.countryName.localeCompare(b.countryName) || a.city.localeCompare(b.city));
  }, [byCountry, pp, cu, ot, of_, wh, prof, filterCountry, filterCarrier]);

  const countries = [...new Set(Object.keys(byCountry))].sort();
  const carriers = [...new Set(
    lines.map(line => {
      const sheet = sheets.find(s => s.id === line.sheet_id);
      return sheet?.status === "active" ? sheet.carrier_name : null;
    }).filter(Boolean)
  )].sort();

  // Origin sites for selected carrier
  const originSites = useMemo(() => {
    if (!filterCarrier) return [];
    return [...new Set(
      activeSheets
        .filter(s => s.carrier_name === filterCarrier && s.supplier_site_name)
        .map(s => s.supplier_site_name)
    )].sort();
  }, [activeSheets, filterCarrier]);
  const hasSimulation = pp > 0 || cu > 0 || ot > 0 || of_ > 0 || wh > 0;

  const handlePrint = () => window.print();

  return (
    <div className="space-y-5">
      {/* Simulation panel */}
      <Card className="overflow-hidden border-blue-200">
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 px-5 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-blue-300" />
            <div>
              <h3 className="font-bold text-white text-sm">Rendszer Szimuláció – Bekerülési ár kalkulátor</h3>
              <p className="text-blue-300 text-xs mt-0.5">Add meg az adatokat, hogy lásd melyik célállomásra mi a valós ár</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="text-xs h-7 border-blue-400 text-blue-200 hover:bg-blue-800" onClick={handlePrint}>
            <Printer className="w-3 h-3 mr-1" /> Nyomtatás
          </Button>
        </div>

        <div className="px-5 py-4 bg-blue-50 border-b border-blue-100">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <SimInput label="Ár (EUR/t)" value={purchasePrice} onChange={setPurchasePrice} placeholder="pl. 550" color="text-slate-700" />
            <SimInput label="Vám (EUR/t)" value={customs} onChange={setCustoms} placeholder="pl. 12" color="text-orange-700" />
            <SimInput label="Egyéb (EUR/t)" value={other} onChange={setOther} placeholder="pl. 5" color="text-slate-600" />
            <SimInput label="Egyéb fuvar (EUR/kamion)" value={otherFreight} onChange={setOtherFreight} placeholder="pl. 0" color="text-blue-700" />
            <SimInput label="Raktár (EUR/t)" value={warehouse} onChange={setWarehouse} placeholder="pl. 0" color="text-purple-700" />
            <SimInput label="Haszon (%)" value={profitPct} onChange={setProfitPct} placeholder="pl. 8" color="text-emerald-700" />
          </div>

          {hasSimulation && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {pp > 0 && <Pill label="Ár" val={`${fmt2(pp)} EUR/t`} color="bg-slate-100 text-slate-700" />}
              {cu > 0 && <Pill label="Vám" val={`${fmt2(cu)} EUR/t`} color="bg-orange-100 text-orange-800" />}
              {ot > 0 && <Pill label="Egyéb" val={`${fmt2(ot)} EUR/t`} color="bg-slate-100 text-slate-600" />}
              {of_ > 0 && <Pill label="Egyéb fuvar" val={`${fmt2(of_)} EUR/kamion`} color="bg-blue-100 text-blue-800" />}
              {wh > 0 && <Pill label="Raktár" val={`${fmt2(wh)} EUR/t`} color="bg-purple-100 text-purple-800" />}
              {prof > 0 && <Pill label="Haszon" val={`${fmt2(prof)}%`} color="bg-emerald-100 text-emerald-800" />}
            </div>
          )}
        </div>

        {/* Country filter */}
        <div className="px-5 py-3 border-b bg-white flex items-center gap-3 flex-wrap">
          <Globe className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Ország:</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterCountry("")}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${!filterCountry ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-500 hover:border-blue-400"}`}
            >Összes</button>
            {countries.map(c => (
              <button
                key={c}
                onClick={() => setFilterCountry(filterCountry === c ? "" : c)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${filterCountry === c ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-500 hover:border-blue-400"}`}
              >{c} · {COUNTRY_NAMES[c] || c}</button>
            ))}
          </div>
        </div>

        {/* Carrier filter */}
        {carriers.length > 0 && (
          <div className="px-5 py-3 border-b bg-white flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-slate-600">Fuvarozó:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilterCarrier("")}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${!filterCarrier ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200 text-slate-500 hover:border-emerald-400"}`}
              >Összes</button>
              {carriers.map(c => (
                <button
                  key={c}
                  onClick={() => setFilterCarrier(filterCarrier === c ? "" : c)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${filterCarrier === c ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200 text-slate-500 hover:border-emerald-400"}`}
                >{c}</button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Results table */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-300" />
            <div>
              <h3 className="font-bold text-white text-sm">Fuvardíj kimutatás – Célállomásonként</h3>
              <p className="text-slate-400 text-xs mt-0.5">Aktív fuvarlapok alapján · {tableRows.length} sor</p>
            </div>
          </div>
          <Badge className="bg-slate-600 text-slate-200 text-xs">{activeSheets.length} aktív fuvarolap</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b text-slate-500">
                <th className="text-left px-4 py-2.5 font-semibold">Ország</th>
                <th className="text-left px-4 py-2.5 font-semibold">Város / Irányítószám</th>
                <th className="text-left px-4 py-2.5 font-semibold">Megye / Régió</th>
                <th className="text-left px-4 py-2.5 font-semibold">Fuvarozó</th>
                <th className="text-right px-4 py-2.5 font-semibold">Belföld (EUR)</th>
                <th className="text-right px-4 py-2.5 font-semibold">Külföld (EUR)</th>
                <th className="text-right px-4 py-2.5 text-blue-600 font-semibold">Összes fuvar (EUR)</th>
                <th className="text-right px-4 py-2.5 font-semibold">Rakomány (t)</th>
                <th className="text-right px-4 py-2.5 text-blue-600 font-semibold">Fuvar EUR/t</th>
                {hasSimulation && <>
                  <th className="text-right px-4 py-2.5 text-slate-500 font-semibold">Bekerülési ár</th>
                  {prof > 0 && <th className="text-right px-4 py-2.5 text-emerald-600 font-semibold">Eladási ár</th>}
                  {prof > 0 && <th className="text-right px-4 py-2.5 text-green-700 font-semibold">Haszon (EUR/t)</th>}
                </>}
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-slate-400">Nincs aktív fuvarolap adat.</td></tr>
              ) : tableRows.map((r, i) => (
                <tr key={i} className={`border-b hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}>
                  <td className="px-4 py-2.5">
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">{r.country}</span>
                    <div className="text-[10px] text-slate-400 mt-0.5">{r.countryName}</div>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-800">
                    {r.city}
                    {r.zip && <span className="text-[10px] text-slate-400 ml-1">({r.zip})</span>}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{r.county || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.carrier}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{fmt2(r.freightDomestic, 0)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{fmt2(r.freightForeign, 0)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-blue-700">{fmt2(r.freight, 0)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-500">{fmt2(r.loadTons)}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-blue-800">
                    <span className="bg-blue-100 px-2 py-0.5 rounded">{fmt2(r.freightPerTon)}</span>
                  </td>
                  {hasSimulation && <>
                    <td className="px-4 py-2.5 text-right">
                      <span className="font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded">
                        {fmt2(r.totalCost)} EUR/t
                      </span>
                    </td>
                    {prof > 0 && (
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          {fmt2(r.sellingPrice)} EUR/t
                        </span>
                      </td>
                    )}
                    {prof > 0 && (
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-bold text-green-800 bg-green-100 px-2 py-0.5 rounded">
                          {fmt2(r.profitAmt)} EUR/t
                        </span>
                      </td>
                    )}
                  </>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SimInput({ label, value, onChange, placeholder, color }) {
  return (
    <div>
      <label className={`text-[11px] font-semibold block mb-1 ${color}`}>{label}</label>
      <Input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-xs bg-white"
      />
    </div>
  );
}

function Pill({ label, val, color }) {
  return (
    <span className={`px-2.5 py-1 rounded-full font-semibold ${color}`}>
      {label}: {val}
    </span>
  );
}
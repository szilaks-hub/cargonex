import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, Truck, Filter } from "lucide-react";

// Hungarian county lookup by city name
const CITY_TO_COUNTY = {
  "Budapest": "Budapest",
  "Debrecen": "Hajdú-Bihar",
  "Miskolc": "Borsod-Abaúj-Zemplén",
  "Győr": "Győr-Moson-Sopron",
  "Pécs": "Baranya",
  "Székesfehérvár": "Fejér",
  "Szombathely": "Vas",
  "Szolnok": "Jász-Nagykun-Szolnok",
  "Kaposvár": "Somogy",
  "Eger": "Heves",
  "Kecskemét": "Bács-Kiskun",
  "Nyíregyháza": "Szabolcs-Szatmár-Bereg",
  "Szeged": "Csongrád-Csanád",
  "Veszprém": "Veszprém",
  "Tatabánya": "Komárom-Esztergom",
  "Zalaegerszeg": "Zala",
  "Dunaújváros": "Fejér",
  "Sopron": "Győr-Moson-Sopron",
  "Esztergom": "Komárom-Esztergom",
  "Érd": "Pest",
  "Dunakeszi": "Pest",
  "Gödöllő": "Pest",
  "Dabas": "Pest",
  "Veresegyház": "Pest",
  "Budaörs": "Pest",
  "Szigetszentmiklós": "Pest",
  "Mosonmagyaróvár": "Győr-Moson-Sopron",
  "Pápa": "Veszprém",
  "Ajka": "Veszprém",
  "Várpalota": "Veszprém",
  "Tapolca": "Veszprém",
  "Baja": "Bács-Kiskun",
  "Kiskunfélegyháza": "Bács-Kiskun",
  "Kiskunhalas": "Bács-Kiskun",
  "Szentes": "Csongrád-Csanád",
  "Hódmezővásárhely": "Csongrád-Csanád",
  "Makó": "Csongrád-Csanád",
  "Békéscsaba": "Békés",
  "Orosháza": "Békés",
  "Gyula": "Békés",
  "Szarvas": "Békés",
  "Hajdúböszörmény": "Hajdú-Bihar",
  "Hajdúszoboszló": "Hajdú-Bihar",
  "Berettyóújfalu": "Hajdú-Bihar",
  "Nyírbátor": "Szabolcs-Szatmár-Bereg",
  "Kisvárda": "Szabolcs-Szatmár-Bereg",
  "Mátészalka": "Szabolcs-Szatmár-Bereg",
  "Kazincbarcika": "Borsod-Abaúj-Zemplén",
  "Ózd": "Borsod-Abaúj-Zemplén",
  "Tiszaújváros": "Borsod-Abaúj-Zemplén",
  "Sátoraljaújhely": "Borsod-Abaúj-Zemplén",
  "Gyöngyös": "Heves",
  "Hatvan": "Heves",
  "Salgótarján": "Nógrád",
  "Balassagyarmat": "Nógrád",
  "Szekszárd": "Tolna",
  "Dombóvár": "Tolna",
  "Bonyhád": "Tolna",
  "Mohács": "Baranya",
  "Komló": "Baranya",
  "Nagykanizsa": "Zala",
  "Keszthely": "Zala",
  "Marcali": "Somogy",
  "Dombóvár": "Somogy",
};

const COUNTY_COLORS = [
  "#3b6cf4", "#e05a2b", "#10b981", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
  "#14b8a6", "#ef4444", "#a855f7", "#22c55e", "#0ea5e9",
  "#d946ef", "#64748b", "#fb923c", "#4ade80", "#38bdf8",
];

export default function ShipmentStats({ trucks }) {
  const [filterCountry, setFilterCountry] = useState("all");
  const [viewMode, setViewMode] = useState("city"); // city | county

  const countries = useMemo(() => {
    const s = new Set(trucks.map(t => t.destination_country).filter(Boolean));
    return ["all", ...Array.from(s).sort()];
  }, [trucks]);

  const filtered = useMemo(() =>
    trucks.filter(t => !["cancelled"].includes(t.status) && (filterCountry === "all" || t.destination_country === filterCountry)),
    [trucks, filterCountry]
  );

  // City stats
  const cityStats = useMemo(() => {
    const map = {};
    filtered.forEach(t => {
      if (!t.destination_city) return;
      const key = t.destination_city;
      if (!map[key]) map[key] = { city: key, country: t.destination_country, count: 0, tons: 0 };
      map[key].count++;
      map[key].tons += (t.actual_weight_tons || t.planned_quantity_tons || 0);
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filtered]);

  // County stats (HU only)
  const countyStats = useMemo(() => {
    const map = {};
    filtered.filter(t => t.destination_country === "HU").forEach(t => {
      const county = t.destination_county || CITY_TO_COUNTY[t.destination_city] || "Ismeretlen";
      if (!map[county]) map[county] = { county, count: 0, tons: 0, cities: new Set() };
      map[county].count++;
      map[county].tons += (t.actual_weight_tons || t.planned_quantity_tons || 0);
      if (t.destination_city) map[county].cities.add(t.destination_city);
    });
    return Object.values(map)
      .map(v => ({ ...v, cities: Array.from(v.cities) }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const maxCityCount = cityStats[0]?.count || 1;
  const maxCountyCount = countyStats[0]?.count || 1;

  const totalTrucks = filtered.length;
  const totalTons = filtered.reduce((s, t) => s + (t.actual_weight_tons || t.planned_quantity_tons || 0), 0);

  const isHUFilter = filterCountry === "HU";
  const showCountyTab = filterCountry === "all" || isHUFilter;

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 bg-blue-50 border-blue-100">
          <div className="text-xs text-blue-500 font-medium">Aktív fuvar</div>
          <div className="text-2xl font-bold text-blue-700">{totalTrucks}</div>
        </Card>
        <Card className="p-3 bg-green-50 border-green-100">
          <div className="text-xs text-green-500 font-medium">Össz. tonna</div>
          <div className="text-2xl font-bold text-green-700">{totalTons.toFixed(1)}</div>
        </Card>
        <Card className="p-3 bg-orange-50 border-orange-100">
          <div className="text-xs text-orange-500 font-medium">Célváros</div>
          <div className="text-2xl font-bold text-orange-700">{cityStats.length}</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 font-medium flex items-center gap-1"><Filter className="w-3 h-3" /> Ország:</span>
        {countries.map(c => (
          <button
            key={c}
            onClick={() => setFilterCountry(c)}
            className={`text-xs px-3 py-1 rounded-full border transition-all font-medium ${
              filterCountry === c
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
            }`}
          >
            {c === "all" ? "Összes" : c}
          </button>
        ))}

        {showCountyTab && (
          <>
            <span className="ml-3 text-xs text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-medium">Nézet:</span>
            <button
              onClick={() => setViewMode("city")}
              className={`text-xs px-3 py-1 rounded-full border transition-all font-medium ${
                viewMode === "city" ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              Város
            </button>
            {showCountyTab && (
              <button
                onClick={() => setViewMode("county")}
                className={`text-xs px-3 py-1 rounded-full border transition-all font-medium ${
                  viewMode === "county" ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                }`}
              >
                Megye (HU)
              </button>
            )}
          </>
        )}
      </div>

      {/* City view */}
      {viewMode === "city" && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-50 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Városonkénti eloszlás</span>
            <span className="text-xs text-slate-400 ml-auto">{cityStats.length} célváros</span>
          </div>
          {cityStats.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">Nincs adat</div>
          ) : (
            <div className="p-4 space-y-2.5">
              {cityStats.map((s, idx) => {
                const pct = (s.count / maxCityCount) * 100;
                const color = COUNTY_COLORS[idx % COUNTY_COLORS.length];
                return (
                  <div key={s.city} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: color }}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-800 truncate">{s.city}</span>
                        <span className="text-xs text-slate-400 ml-2 flex-shrink-0">{s.country}</span>
                        <span className="text-xs font-bold text-slate-700 ml-3 flex-shrink-0">{s.count} db</span>
                      </div>
                      <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{s.tons.toFixed(1)} t</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* County view (HU) */}
      {viewMode === "county" && (
        <div className="space-y-3">
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b bg-slate-50 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">Magyarország – Megye szerinti eloszlás</span>
              <span className="text-xs text-slate-400 ml-auto">{countyStats.length} megye</span>
            </div>
            {countyStats.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">Nincs HU célállomás adat</div>
            ) : (
              <div className="p-4 space-y-3">
                {countyStats.map((s, idx) => {
                  const pct = (s.count / maxCountyCount) * 100;
                  const color = COUNTY_COLORS[idx % COUNTY_COLORS.length];
                  return (
                    <div key={s.county} className="rounded-xl border p-3" style={{ borderColor: `${color}40`, background: `${color}08` }}>
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-sm"
                          style={{ background: color }}
                        >
                          {s.count}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-800 text-sm">{s.county}</div>
                          <div className="text-[10px] text-slate-500">{s.tons.toFixed(1)} t összesen</div>
                        </div>
                        <Badge className="text-[10px]" style={{ background: `${color}20`, color: color, border: `1px solid ${color}40` }}>
                          {((s.count / totalTrucks) * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      <div className="relative h-3 bg-white rounded-full overflow-hidden border" style={{ borderColor: `${color}30` }}>
                        <div
                          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
                        />
                      </div>
                      {s.cities.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {s.cities.map(c => (
                            <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-white border text-slate-500" style={{ borderColor: `${color}30` }}>
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
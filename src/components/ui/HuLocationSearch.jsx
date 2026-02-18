import React, { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Pencil, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BUDAPEST_DISTRICTS = [
  "I.", "II.", "III.", "IV.", "V.", "VI.", "VII.", "VIII.", "IX.", "X.",
  "XI.", "XII.", "XIII.", "XIV.", "XV.", "XVI.", "XVII.", "XVIII.", "XIX.",
  "XX.", "XXI.", "XXII.", "XXIII."
];

const isBudapest = (city) => city && city.toLowerCase().startsWith("budapest");

/**
 * Smart bidirectional Hungarian location search.
 * - ZIP → city + county auto-fill
 * - City name → dropdown with ZIP + county
 * - Budapest special: ZIP optional, district field appears
 * - County readonly with manual edit pencil
 */
export default function HuLocationSearch({
  zip = "", city = "", county = "", district = "",
  onChange, disabled = false, inputClassName = ""
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [countyEditing, setCountyEditing] = useState(false);
  const [localCounty, setLocalCounty] = useState(county);
  const [localDistrict, setLocalDistrict] = useState(district);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  const budapestMode = isBudapest(city);

  useEffect(() => { setLocalCounty(county); }, [county]);
  useEffect(() => { setLocalDistrict(district); }, [district]);

  useEffect(() => {
    const handler = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (q) => {
    if (!q || q.length < 2) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      let results = [];
      const isNumeric = /^\d+$/.test(q);
      if (isNumeric) {
        results = await base44.entities.HuZip.filter({ zip: { $regex: `^${q}` } }, "zip", 10);
      } else {
        // Add Budapest as first synthetic option if query matches
        if ("budapest".startsWith(q.toLowerCase())) {
          results = [{ id: "__budapest__", zip: "", city: "Budapest", county: "Budapest / Főváros", synthetic: true }];
        }
        const dbResults = await base44.entities.HuZip.filter({ city: { $regex: `^${q}`, $options: "i" } }, "city", 12);
        // Merge, avoiding duplicate Budapest entries from DB
        const filtered = dbResults.filter(r => !isBudapest(r.city));
        results = [...results, ...filtered];
      }
      setSuggestions(results);
      setOpen(results.length > 0);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 220);
  };

  const handleSelect = (item) => {
    setQuery("");
    const newCounty = item.county || "";
    setLocalCounty(newCounty);
    setLocalDistrict("");
    onChange({ zip: item.zip || "", city: item.city, county: newCounty, district: "" });
    setSuggestions([]);
    setOpen(false);
  };

  const handleCountyChange = (val) => {
    setLocalCounty(val);
    onChange({ zip, city, county: val, district: localDistrict });
  };

  const handleDistrictChange = (val) => {
    setLocalDistrict(val);
    onChange({ zip, city, county: localCounty, district: val });
  };

  const displayValue = () => {
    if (query) return query;
    if (budapestMode) return "Budapest";
    if (zip && city) return `${zip} – ${city}`;
    return zip || city || "";
  };

  const inp = inputClassName || "h-8 text-xs bg-white border-[#c6ccda] text-slate-800 px-2";

  return (
    <div ref={containerRef} className="flex flex-col gap-1 w-full">
      <div className="flex gap-1 items-start w-full">
        {/* Unified location search */}
        <div className="relative flex-1 min-w-0">
          <div className="relative">
            <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
            <Input
              className={`${inp} pl-6`}
              value={displayValue()}
              onFocus={() => { setQuery(""); if (suggestions.length) setOpen(true); }}
              onChange={handleQueryChange}
              placeholder={disabled ? "—" : "ISZ vagy Város keresése..."}
              disabled={disabled}
            />
          </div>
          {open && suggestions.length > 0 && (
            <div className="absolute z-50 left-0 mt-0.5 w-full min-w-[240px] max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl text-xs" style={{ top: "100%" }}>
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 flex gap-2 items-baseline border-b border-slate-50 last:border-0"
                >
                  {s.synthetic ? (
                    <>
                      <span className="text-amber-600 font-bold shrink-0">🏛</span>
                      <span className="text-slate-800 font-bold flex-1">Budapest</span>
                      <span className="text-slate-400">Főváros – ISZ nélkül is elfogadott</span>
                    </>
                  ) : (
                    <>
                      <span className="font-mono font-bold text-slate-700 w-10 shrink-0">{s.zip}</span>
                      <span className="text-slate-800 font-medium flex-1">{s.city}</span>
                      {s.county && <span className="text-slate-400 truncate ml-1">{s.county}</span>}
                    </>
                  )}
                </button>
              ))}
              {loading && <div className="px-3 py-2 text-slate-400">Keresés...</div>}
            </div>
          )}
        </div>

        {/* County – readonly with edit toggle */}
        <div className="flex items-center gap-0.5 min-w-[110px] max-w-[150px]">
          {countyEditing ? (
            <Input
              className={`${inp} flex-1`}
              value={localCounty}
              onChange={e => handleCountyChange(e.target.value)}
              onBlur={() => setCountyEditing(false)}
              autoFocus
              placeholder="Vármegye"
            />
          ) : (
            <div
              className="flex-1 h-8 px-2 flex items-center text-xs rounded-md border border-dashed border-slate-200 text-slate-500 bg-slate-50 truncate cursor-default select-none"
              title={localCounty || "Vármegye"}
            >
              {localCounty || <span className="text-slate-300">Vármegye</span>}
            </div>
          )}
          {!disabled && (
            <button
              type="button"
              onClick={() => setCountyEditing(v => !v)}
              className="text-slate-300 hover:text-slate-500 p-0.5 ml-0.5"
              title="Kézi szerkesztés"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Budapest district selector */}
      {budapestMode && !disabled && (
        <div className="flex items-center gap-2 pl-1">
          <span className="text-[10px] text-amber-600 font-semibold">Kerület (opcionális):</span>
          <Select value={localDistrict} onValueChange={handleDistrictChange}>
            <SelectTrigger className="h-7 text-xs w-28 bg-amber-50 border-amber-200">
              <SelectValue placeholder="– kerület –" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value={null}>– nincs –</SelectItem>
              {BUDAPEST_DISTRICTS.map(d => <SelectItem key={d} value={d}>{d} kerület</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-[10px] text-slate-400">ISZ elhagyható Budapest esetén</span>
        </div>
      )}
    </div>
  );
}
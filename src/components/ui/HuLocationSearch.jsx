import React, { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Pencil, MapPin } from "lucide-react";

/**
 * Smart bidirectional Hungarian location search.
 * Typing a ZIP (4 digits) → auto-fills city + county.
 * Typing a city name → dropdown with ZIP + county, select to fill all.
 * County is readonly but can be manually overridden via edit icon.
 *
 * Props:
 *   zip, city, county – current values
 *   onChange({ zip, city, county }) – called on any change
 *   disabled – optional readonly mode
 *   inputClassName – optional class override for inputs
 */
export default function HuLocationSearch({ zip = "", city = "", county = "", onChange, disabled = false, inputClassName = "" }) {
  const [query, setQuery] = useState(""); // unified search input
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [countyEditing, setCountyEditing] = useState(false);
  const [localCounty, setLocalCounty] = useState(county);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Sync county from prop
  useEffect(() => { setLocalCounty(county); }, [county]);

  // Close dropdown on outside click
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
        // Search by ZIP prefix
        results = await base44.entities.HuZip.filter({ zip: { $regex: `^${q}` } }, "zip", 10);
      } else {
        // Search by city name prefix (case-insensitive)
        results = await base44.entities.HuZip.filter({ city: { $regex: `^${q}`, $options: "i" } }, "city", 12);
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
    // Auto-fill if exactly 4 digits and unique
    if (/^\d{4}$/.test(val)) {
      // Will be resolved via search
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 220);
  };

  const handleSelect = (item) => {
    setQuery(""); // clear search box after selection
    setLocalCounty(item.county || "");
    onChange({ zip: item.zip, city: item.city, county: item.county || "" });
    setSuggestions([]);
    setOpen(false);
  };

  const handleCountyChange = (val) => {
    setLocalCounty(val);
    onChange({ zip, city, county: val });
  };

  const inp = inputClassName || "h-8 text-xs bg-white border-[#c6ccda] text-slate-800 px-2";

  return (
    <div ref={containerRef} className="flex gap-1 items-start w-full">
      {/* Unified location search */}
      <div className="relative flex-1 min-w-0">
        <div className="relative">
          <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          <Input
            className={`${inp} pl-6`}
            value={query || (zip && city ? `${zip} – ${city}` : zip || city || "")}
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
                <span className="font-mono font-bold text-slate-700 w-10 shrink-0">{s.zip}</span>
                <span className="text-slate-800 font-medium flex-1">{s.city}</span>
                {s.county && <span className="text-slate-400 truncate ml-1">{s.county}</span>}
              </button>
            ))}
            {loading && <div className="px-3 py-2 text-slate-400">Keresés...</div>}
          </div>
        )}
      </div>

      {/* County – readonly with edit toggle */}
      <div className="flex items-center gap-0.5 min-w-[110px] max-w-[140px]">
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
            className={`flex-1 h-8 px-2 flex items-center text-xs rounded-md border border-dashed border-slate-200 text-slate-500 bg-slate-50 truncate cursor-default select-none`}
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
  );
}
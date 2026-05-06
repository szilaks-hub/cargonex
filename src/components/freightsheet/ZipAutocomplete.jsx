import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";

/**
 * ZIP autocomplete for Hungarian postal codes.
 * Queries HuZip entity and on selection fills city + county.
 */
export default function ZipAutocomplete({ value, inputClassName, onZipChange, onSelect, placeholder = "ISZ" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Fetch matching ZIP records when user types >= 1 char
  const { data: suggestions = [] } = useQuery({
    queryKey: ["huzip", value],
    queryFn: () => base44.entities.HuZip.filter({ zip: { $regex: `^${value}` } }, "zip", 30),
    enabled: !!value && value.length >= 1,
    staleTime: 60_000,
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (e) => {
    onZipChange(e.target.value);
    setOpen(true);
  };

  const handleSelect = (item) => {
    onSelect(item.zip, item.city, item.county);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <Input
        className={inputClassName}
        value={value}
        onChange={handleChange}
        onFocus={() => value && setOpen(true)}
        placeholder={placeholder}
        maxLength={4}
      />
      {open && suggestions.length > 0 && (
        <div
          className="absolute z-50 left-0 mt-0.5 min-w-[200px] max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg text-xs"
          style={{ top: "100%" }}
        >
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 flex gap-2 items-baseline border-b border-slate-50 last:border-0"
            >
              <span className="font-mono font-semibold text-slate-700 w-8 shrink-0">{s.zip}</span>
              <span className="text-slate-800 font-medium">{s.city}</span>
              {s.county && <span className="text-slate-400 ml-auto truncate">{s.county}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
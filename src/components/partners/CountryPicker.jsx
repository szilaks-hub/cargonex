import React, { useState } from "react";
import { X, Search } from "lucide-react";

export const COUNTRIES = [
  { code: "HU", en: "Hungary",        hu: "Magyarország",  vat: ["HU"] },
  { code: "RS", en: "Serbia",         hu: "Szerbia",        vat: ["RS"] },
  { code: "HR", en: "Croatia",        hu: "Horvátország",   vat: ["HR"] },
  { code: "SK", en: "Slovakia",       hu: "Szlovákia",      vat: ["SK"] },
  { code: "PL", en: "Poland",         hu: "Lengyelország",  vat: ["PL"] },
  { code: "CZ", en: "Czech Republic", hu: "Csehország",     vat: ["CZ"] },
  { code: "RO", en: "Romania",        hu: "Románia",        vat: ["RO"] },
  { code: "BG", en: "Bulgaria",       hu: "Bulgária",       vat: ["BG"] },
];

export function guessCountryFromVat(vatOrTax) {
  if (!vatOrTax) return null;
  const prefix = vatOrTax.trim().toUpperCase().slice(0, 2);
  return COUNTRIES.find((c) => c.vat.includes(prefix)) || null;
}

/**
 * CountryPicker — multi-select tag picker
 * value: array of country codes e.g. ["HU","RS"]
 * onChange: (newArray) => void
 * single: if true, only one selection allowed
 */
export default function CountryPicker({ value = [], onChange, single = false, label = "Country / Ország", required = false }) {
  const [search, setSearch] = useState("");

  const selected = value || [];

  const toggle = (code) => {
    if (single) {
      onChange(selected.includes(code) ? [] : [code]);
      return;
    }
    onChange(
      selected.includes(code)
        ? selected.filter((c) => c !== code)
        : [...selected, code]
    );
  };

  const remove = (code) => onChange(selected.filter((c) => c !== code));

  const filtered = COUNTRIES.filter((c) =>
    !search || c.en.toLowerCase().includes(search.toLowerCase()) || c.hu.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-xs font-semibold text-slate-600">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* Quick-pick chips */}
      <div className="flex flex-wrap gap-1.5">
        {filtered.map((c) => {
          const isActive = selected.includes(c.code);
          return (
            <button
              key={c.code}
              type="button"
              onClick={() => toggle(c.code)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                isActive
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600"
              }`}
            >
              <span className="text-[10px] font-bold opacity-70">{c.code}</span>
              {c.en}
            </button>
          );
        })}
      </div>

      {/* Selected tags summary (only if multiple shown) */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {selected.map((code) => {
            const c = COUNTRIES.find((x) => x.code === code);
            if (!c) return null;
            return (
              <span
                key={code}
                className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 text-xs font-medium"
              >
                {c.en} / {c.hu}
                <button type="button" onClick={() => remove(code)} className="hover:text-red-500 ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
import React, { useState, useMemo } from "react";
import { Heart, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFavorites } from "./useFavorites";
import { sortWithFavorites } from "./sortProducts";

/**
 * Universal product picker used in TruckForm, OrderLineForm, etc.
 * Props:
 *   products         – full product list
 *   value            – selected product_id
 *   onChange(product) – called with full product object
 *   filterCategoryId – optional: only show products from this category
 *   className        – extra classes for wrapper
 *   dark             – if true use dark theme (forms on dark bg)
 */
export default function ProductPicker({ products = [], value, onChange, filterCategoryId, dark = false, className = "" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { favoriteProductIds, toggleFavorite } = useFavorites();

  const selected = products.find((p) => p.id === value);

  const filtered = useMemo(() => {
    let list = products.filter((p) => p.status === "active" || p.id === value);
    if (filterCategoryId) list = list.filter((p) => p.category_id === filterCategoryId);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        [p.factory_code, p.mesh_name, p.hs_code, p.category_name, String(p.diameter || "")]
          .some((v) => v?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, filterCategoryId, search, value]);

  const { favs, rest } = useMemo(() => sortWithFavorites(filtered, favoriteProductIds), [filtered, favoriteProductIds]);

  const displayLabel = (p) => {
    if (!p) return "";
    return [p.category_name, p.diameter ? `Ø${p.diameter}` : null, p.length ? `L${p.length}` : null, p.factory_code]
      .filter(Boolean).join(" ");
  };

  const inputCls = dark
    ? "bg-[#22272e] border-[#2d333b] text-[#e6edf3] placeholder:text-[#8b949e]"
    : "bg-white border-[#D9E1E8] text-slate-800";

  const dropdownBg = dark ? "bg-[#1a1e23] border-[#2d333b]" : "bg-white border-[#D9E1E8]";

  const handleSelect = (p) => {
    onChange(p);
    setOpen(false);
    setSearch("");
  };

  const ProductRow = ({ p, isFav }) => (
    <div
      key={p.id}
      className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors rounded ${
        p.id === value
          ? dark ? "bg-blue-700/30 text-blue-300" : "bg-blue-50 text-blue-700"
          : dark ? "hover:bg-white/5 text-[#c9d1d9]" : "hover:bg-slate-50 text-slate-700"
      }`}
      onClick={() => handleSelect(p)}
    >
      <button
        className="flex-shrink-0"
        onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }}
        title={isFav ? "Remove favorite" : "Add to favorites"}
      >
        <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-rose-500 text-rose-500" : dark ? "text-[#444d56]" : "text-slate-300"}`} />
      </button>
      <span className="flex-1 text-xs font-medium truncate">{displayLabel(p)}</span>
      {p.hs_code && <span className={`text-[10px] flex-shrink-0 ${dark ? "text-[#8b949e]" : "text-slate-400"}`}>{p.hs_code}</span>}
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      {/* Trigger */}
      <div
        className={`flex items-center h-9 px-3 rounded-md border cursor-pointer text-sm ${inputCls}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`flex-1 truncate ${!selected ? (dark ? "text-[#8b949e]" : "text-slate-400") : ""}`}>
          {selected ? displayLabel(selected) : "Select product..."}
        </span>
        <span className={`text-xs ml-2 flex-shrink-0 ${dark ? "text-[#8b949e]" : "text-slate-400"}`}>▾</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div className={`absolute z-50 left-0 right-0 mt-1 rounded-xl border shadow-xl overflow-hidden ${dropdownBg}`} style={{ maxHeight: 340 }}>
          {/* Search */}
          <div className={`p-2 border-b ${dark ? "border-[#2d333b]" : "border-[#eef0f3]"}`}>
            <div className="relative">
              <Search className={`absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${dark ? "text-[#8b949e]" : "text-slate-400"}`} />
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code, HS, diameter..."
                className={`pl-7 h-7 text-xs ${inputCls}`}
              />
            </div>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 280 }}>
            {/* Favorites section */}
            {favs.length > 0 && (
              <div>
                <div className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1 ${dark ? "text-rose-400 bg-rose-500/5" : "text-rose-600 bg-rose-50"}`}>
                  <Heart className="w-3 h-3 fill-current" /> Favorites / Kedvencek
                </div>
                {favs.map((p) => <ProductRow key={p.id} p={p} isFav={true} />)}
              </div>
            )}

            {/* All products section */}
            {rest.length > 0 && (
              <div>
                {favs.length > 0 && (
                  <div className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide ${dark ? "text-[#8b949e] bg-white/3" : "text-slate-500 bg-slate-50"}`}>
                    All products / Összes termék
                  </div>
                )}
                {rest.map((p) => <ProductRow key={p.id} p={p} isFav={false} />)}
              </div>
            )}

            {favs.length === 0 && rest.length === 0 && (
              <div className={`py-8 text-center text-xs ${dark ? "text-[#8b949e]" : "text-slate-400"}`}>
                No products found / Nincs találat
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(""); }} />}
    </div>
  );
}
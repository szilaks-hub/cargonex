import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import StatusBadge from "@/components/ui/StatusBadge";
import RowActions from "@/components/ui/RowActions";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Package, Hash, Layers } from "lucide-react";

// Detect category type from name (EN or HU)
function getCategoryType(name = "") {
  const n = name.toLowerCase();
  if (n.includes("mesh") || n.includes("háló")) return "mesh";
  if (n.includes("wire rod") || n.includes("huzal")) return "wirerod";
  if (n.includes("coil") || n.includes("tekercs")) return "coil";
  return "rebar"; // default: rebar / betonacél
}

function getColumnsForType(type) {
  const actionsCol = (onEdit, onArchive, onDelete) => ({
    header: "",
    render: (r) => (
      <RowActions
        onEdit={() => onEdit(r)}
        onArchive={() => onArchive(r)}
        isArchived={r.status === "archived"}
        canDelete={r.status === "archived"}
        onDelete={() => onDelete(r)}
      />
    ),
  });

  const base = [
    { header: "Factory Code", key: "factory_code", render: (r) => (
      <span className={r.status === "archived" ? "opacity-40 line-through" : ""}>{r.factory_code || "-"}</span>
    )},
  ];
  if (type === "mesh") {
    return [
      ...base,
      { header: "Mesh Name", render: (r) => r.mesh_name || "-" },
      { header: "Dim.", render: (r) => r.additional_dimension || "-" },
      { header: "Diameter", render: (r) => r.diameter ? `${r.diameter} mm` : "-" },
      { header: "Unit", key: "unit_of_measure" },
      { header: "Bundle (kg)", render: (r) => r.bundle_weight ?? "-" },
      { header: "HS Code", key: "hs_code" },
      { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      actionsCol(onEdit, onArchive, onDelete),
    ];
  }
  if (type === "wirerod") {
    return [
      ...base,
      { header: "Diameter", render: (r) => r.diameter ? `${r.diameter} mm` : "-" },
      { header: "Unit", key: "unit_of_measure" },
      { header: "Bundle (kg)", render: (r) => r.bundle_weight ?? "-" },
      { header: "HS Code", key: "hs_code" },
      { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      actionsCol(onEdit, onArchive, onDelete),
    ];
  }
  // rebar + coil
  return [
    ...base,
    { header: "Diameter", render: (r) => r.diameter ? `${r.diameter} mm` : "-" },
    { header: "Length", render: (r) => r.length ? `${r.length} mm` : "-" },
    { header: "Unit", key: "unit_of_measure" },
    { header: "Bundle (kg)", render: (r) => r.bundle_weight ?? "-" },
    { header: "HS Code", key: "hs_code" },
    { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    actionsCol(onEdit, onArchive, onDelete),
  ];
}

function CategorySummary({ items }) {
  const active = items.filter((p) => p.status === "active").length;
  const diameters = items.map((p) => p.diameter).filter(Boolean);
  const avgDia = diameters.length ? (diameters.reduce((a, b) => a + b, 0) / diameters.length).toFixed(1) : null;
  const hsCounts = {};
  items.forEach((p) => { if (p.hs_code) hsCounts[p.hs_code] = (hsCounts[p.hs_code] || 0) + 1; });
  const topHs = Object.entries(hsCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <div className="flex flex-wrap gap-4 px-4 py-2.5 border-b border-[#D9E1E8] text-xs" style={{ background: "#f0f4f8" }}>
      <span className="flex items-center gap-1.5 text-slate-600">
        <Package className="w-3.5 h-3.5 text-[#2563eb]" />
        <span className="font-semibold text-slate-800">{active}</span> active item{active !== 1 ? "s" : ""}
        {items.length > active && <span className="text-slate-400">/ {items.length} total</span>}
      </span>
      {avgDia && (
        <span className="flex items-center gap-1.5 text-slate-600">
          <Layers className="w-3.5 h-3.5 text-[#2563eb]" />
          Avg ⌀ <span className="font-semibold text-slate-800">{avgDia} mm</span>
        </span>
      )}
      {topHs && (
        <span className="flex items-center gap-1.5 text-slate-600">
          <Hash className="w-3.5 h-3.5 text-[#2563eb]" />
          Top HS: <span className="font-semibold text-slate-800">{topHs}</span>
        </span>
      )}
    </div>
  );
}

function ProductTable({ items, columns, onRowClick }) {
  if (items.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-400">
        No products in this category / Nincs termék ebben a kategóriában
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "#e4e7ec" }}>
            {columns.map((col, i) => (
              <th key={i} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5 border-b border-[#D9E1E8] whitespace-nowrap">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((row, i) => (
            <tr
              key={row.id || i}
              onClick={() => onRowClick(row)}
              className="border-b border-[#eef0f3] hover:bg-blue-50/50 cursor-pointer transition-colors"
              style={{ background: i % 2 === 0 ? "#ffffff" : "#fafbfc" }}
            >
              {columns.map((col, j) => (
                <td key={j} className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProductCatalog({ products, categories, isLoading, onEdit, onAdd }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const qc = useQueryClient();

  const handleArchive = async (r) => {
    const newStatus = r.status === "archived" ? "active" : "archived";
    await base44.entities.Product.update(r.id, { status: newStatus });
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  const handleDelete = async (r) => {
    await base44.entities.Product.delete(r.id);
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  // Build category list with counts
  const categoriesWithCounts = useMemo(() => {
    return categories.map((cat) => ({
      ...cat,
      count: products.filter((p) => p.category_id === cat.id).length,
    }));
  }, [categories, products]);

  // Filtered products
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategoryId === "all" || p.category_id === selectedCategoryId;
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      const q = search.toLowerCase();
      const matchSearch = !q || [p.factory_code, p.hs_code, p.mesh_name, p.category_name]
        .some((v) => v?.toLowerCase().includes(q));
      return matchCat && matchStatus && matchSearch;
    });
  }, [products, selectedCategoryId, search, statusFilter]);

  // Group by category for display
  const groupedCategories = useMemo(() => {
    if (selectedCategoryId !== "all") {
      const cat = categories.find((c) => c.id === selectedCategoryId);
      if (!cat) return [];
      return [{ cat, items: filtered }];
    }
    return categories
      .map((cat) => ({ cat, items: filtered.filter((p) => p.category_id === cat.id) }))
      .filter((g) => g.items.length > 0);
  }, [filtered, categories, selectedCategoryId]);

  if (isLoading) {
    return <div className="py-20 text-center text-sm text-slate-400">Loading... / Betöltés...</div>;
  }

  return (
    <div className="flex gap-4 mt-1">
      {/* Left: Category sidebar */}
      <div className="w-52 flex-shrink-0 space-y-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-2 mb-2">Categories</p>
        <button
          onClick={() => setSelectedCategoryId("all")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
            selectedCategoryId === "all"
              ? "bg-[#2563eb] text-white font-medium shadow-sm"
              : "text-slate-600 hover:bg-white hover:shadow-sm"
          }`}
        >
          <span>All / Összes</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedCategoryId === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
            {products.length}
          </span>
        </button>
        {categoriesWithCounts.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategoryId(cat.id)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedCategoryId === cat.id
                ? "bg-[#2563eb] text-white font-medium shadow-sm"
                : "text-slate-600 hover:bg-white hover:shadow-sm"
            }`}
          >
            <span className="truncate text-left">{cat.name_en}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1 ${selectedCategoryId === cat.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      {/* Right: main content */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Top filter bar */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code, HS, mesh..."
              className="pl-8 h-8 text-xs bg-white border-[#D9E1E8] rounded-lg"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-32 bg-white border-[#D9E1E8] rounded-lg">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={onAdd}
            className="h-8 px-3 text-xs font-medium text-white rounded-lg flex items-center gap-1.5 shadow-sm"
            style={{ background: "#2563eb" }}
          >
            + New Product / Új termék
          </button>
        </div>

        {/* Category groups */}
        {groupedCategories.length === 0 ? (
          <div className="rounded-xl border border-[#D9E1E8] bg-white py-16 text-center text-sm text-slate-400">
            No products found / Nincs találat
          </div>
        ) : (
          <div className="space-y-4">
            {groupedCategories.map(({ cat, items }) => {
              const type = getCategoryType(cat.name_en);
              const columns = getColumnsForType(type);
              return (
                <div key={cat.id} className="rounded-xl border border-[#D9E1E8] overflow-hidden shadow-sm">
                  {/* Category header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-[#D9E1E8]" style={{ background: "#f4f6f8" }}>
                    <div className="w-2 h-2 rounded-full bg-[#2563eb]" />
                    <div>
                      <span className="text-sm font-semibold text-[#2E3A46]">{cat.name_en}</span>
                      {cat.name_hu && <span className="text-xs text-slate-400 ml-2">/ {cat.name_hu}</span>}
                    </div>
                    <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-[#2563eb]/10 text-[#2563eb]">
                      {items.length} item{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {/* Summary row */}
                  <CategorySummary items={items} />
                  {/* Table */}
                  <ProductTable items={items} columns={columns} onRowClick={onEdit} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
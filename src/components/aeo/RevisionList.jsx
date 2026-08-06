import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertCircle, Clock, FileWarning } from "lucide-react";

export default function RevisionList() {
  const { data: trucks = [] } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => base44.entities.Truck.list("-created_date", 1000),
  });

  const [filter, setFilter] = useState("all"); // all | pending | done

  // Minden eshetőség: amendment_requested=true VAGY van már 2. MRN (mrn_number_2)
  const amendmentTrucks = trucks
    .filter((t) => t.amendment_requested || t.mrn_number_2)
    .sort((a, b) => (b.amendment_requested_at || "").localeCompare(a.amendment_requested_at || ""));

  const pending = amendmentTrucks.filter((t) => !t.mrn_number_2);
  const done = amendmentTrucks.filter((t) => t.mrn_number_2);

  const shown = filter === "pending" ? pending : filter === "done" ? done : amendmentTrucks;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <FileWarning className="w-4 h-4 text-amber-600" />
            <div className="text-xs text-slate-500 font-semibold">Összes módosítási kérelem</div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{amendmentTrucks.length}</div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-600" />
            <div className="text-xs text-slate-500 font-semibold">2. MRN még várható</div>
          </div>
          <div className="text-2xl font-extrabold text-amber-700">{pending.length}</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-green-600" />
            <div className="text-xs text-slate-500 font-semibold">2. MRN megérkezett</div>
          </div>
          <div className="text-2xl font-extrabold text-green-700">{done.length}</div>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2">
        {[
          { key: "all", label: "Összes" },
          { key: "pending", label: `Várható (${pending.length})` },
          { key: "done", label: `Megérkezett (${done.length})` },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
              filter === f.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="px-3 py-2.5 text-left font-semibold">#</th>
              <th className="px-3 py-2.5 text-left font-semibold">Rendszám</th>
              <th className="px-3 py-2.5 text-left font-semibold">Rakodás dátuma</th>
              <th className="px-3 py-2.5 text-left font-semibold">Fuvarozó</th>
              <th className="px-3 py-2.5 text-left font-semibold">Eladó</th>
              <th className="px-3 py-2.5 text-left font-semibold">1. MRN szám</th>
              <th className="px-3 py-2.5 text-left font-semibold">1. MRN dátum</th>
              <th className="px-3 py-2.5 text-left font-semibold">Kérelem dátuma</th>
              <th className="px-3 py-2.5 text-left font-semibold">2. MRN szám</th>
              <th className="px-3 py-2.5 text-left font-semibold">2. MRN dátum</th>
              <th className="px-3 py-2.5 text-center font-semibold">Státusz</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan="11" className="px-4 py-10 text-center text-slate-400">
                  Nincs megjeleníthető tétel
                </td>
              </tr>
            )}
            {shown.map((t, i) => {
              const has2 = !!t.mrn_number_2;
              return (
                <tr
                  key={t.id}
                  className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-amber-50/50 transition-colors`}
                >
                  <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2 font-bold text-slate-900 whitespace-nowrap">{t.truck_number || "—"}</td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{t.actual_loading_date || t.loading_date || "—"}</td>
                  <td className="px-3 py-2 text-slate-700 max-w-[10rem] truncate">{t.carrier_name || "—"}</td>
                  <td className="px-3 py-2 text-slate-700 max-w-[10rem] truncate">{t.supplier_name || "—"}</td>
                  <td className="px-3 py-2 font-mono font-semibold text-slate-800 whitespace-nowrap">{t.mrn_number || "—"}</td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{t.mrn_date || "—"}</td>
                  <td className="px-3 py-2 text-amber-700 font-semibold whitespace-nowrap">
                    {t.amendment_requested_at ? new Date(t.amendment_requested_at).toLocaleDateString("hu-HU") : "—"}
                  </td>
                  <td className={`px-3 py-2 font-mono font-semibold whitespace-nowrap ${has2 ? "text-green-700" : "text-slate-300"}`}>
                    {t.mrn_number_2 || "—"}
                  </td>
                  <td className={`px-3 py-2 whitespace-nowrap ${has2 ? "text-green-700 font-semibold" : "text-slate-300"}`}>
                    {t.mrn_date_2 || "—"}
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    {has2 ? (
                      <span className="inline-flex items-center gap-1 text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded-full">
                        ✔ Megérkezett
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 font-bold text-xs bg-amber-100 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3" /> Várható
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
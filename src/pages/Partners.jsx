import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import PartnerForm from "@/components/partners/PartnerForm";
import PartnerDetail from "@/components/partners/PartnerDetail";
import RowActions from "@/components/ui/RowActions";
import { Badge } from "@/components/ui/badge";
import { COUNTRIES } from "@/components/partners/CountryPicker";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

const ROLE_META = {
  supplier:      { label: "Supplier",       labelHu: "Beszállító",  cls: "bg-blue-50 text-blue-700 border-blue-200" },
  customer:      { label: "Customer",       labelHu: "Vevő",        cls: "bg-green-50 text-green-700 border-green-200" },
  carrier:       { label: "Carrier",        labelHu: "Fuvarozó",    cls: "bg-orange-50 text-orange-700 border-orange-200" },
  customs_agent: { label: "Customs Agent",  labelHu: "Vámügynök",  cls: "bg-purple-50 text-purple-700 border-purple-200" },
};

const ALL_ROLES = Object.keys(ROLE_META);
const ALL_STATUSES = ["active", "inactive", "archived"];

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
        active
          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
          : "bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-700"
      }`}
    >
      {children}
    </button>
  );
}

export default function Partners() {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [filterRole, setFilterRole] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["partners"],
    queryFn: () => base44.entities.Partner.list(),
  });

  const { data: allLocations = [] } = useQuery({
    queryKey: ["all-locations"],
    queryFn: () => base44.entities.PartnerLocation.list(),
  });

  const { data: allContacts = [] } = useQuery({
    queryKey: ["all-contacts"],
    queryFn: () => base44.entities.ContactPerson.list(),
  });

  // Build lookup maps
  const locationCountByPartner = useMemo(() => {
    const map = {};
    allLocations.forEach((l) => {
      map[l.partner_id] = (map[l.partner_id] || 0) + 1;
    });
    return map;
  }, [allLocations]);

  const mainContactByPartner = useMemo(() => {
    const map = {};
    allContacts.forEach((c) => {
      if (!map[c.partner_id]) map[c.partner_id] = c;
    });
    return map;
  }, [allContacts]);

  const handleArchive = async (r) => {
    const newStatus = r.status === "archived" ? "active" : "archived";
    await base44.entities.Partner.update(r.id, { status: newStatus });
    qc.invalidateQueries({ queryKey: ["partners"] });
  };

  const handleDelete = async (r) => {
    await base44.entities.Partner.delete(r.id);
    qc.invalidateQueries({ queryKey: ["partners"] });
  };

  const visiblePartners = useMemo(() => {
    return partners.filter((p) => {
      if (filterStatus && p.status !== filterStatus) return false;
      if (filterRole && !(p.roles || []).includes(filterRole)) return false;
      if (filterCountry) {
        const codes = p.countries?.length ? p.countries : (p.country ? [p.country] : []);
        if (!codes.includes(filterCountry)) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const fields = [p.name, p.tax_number, p.eu_vat, p.city, p.email].map((f) => (f || "").toLowerCase());
        if (!fields.some((f) => f.includes(q))) return false;
      }
      return true;
    });
  }, [partners, filterStatus, filterRole, filterCountry, search]);

  const columns = [
    {
      header: "Name / Név",
      render: (r) => (
        <div>
          <div className={`font-semibold text-slate-800 ${r.status === "archived" ? "opacity-40 line-through" : ""}`}>{r.name}</div>
          {r.eu_vat && <div className="text-[10px] text-slate-400 font-mono">{r.eu_vat}</div>}
        </div>
      ),
    },
    {
      header: "Roles / Szerepek",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {(r.roles || []).map((role) => {
            const m = ROLE_META[role];
            return (
              <span key={role} className={`inline-flex items-center border rounded-full px-2 py-0.5 text-[10px] font-semibold ${m?.cls || ""}`}>
                {m?.label || role}
              </span>
            );
          })}
        </div>
      ),
    },
    {
      header: "Country / Ország",
      render: (r) => {
        const codes = r.countries?.length ? r.countries : (r.country ? [r.country] : []);
        if (!codes.length) return <span className="text-slate-400">-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {codes.map((code) => {
              const c = COUNTRIES.find((x) => x.code === code);
              return (
                <span key={code} className="inline-flex items-center bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 text-[10px] font-medium">
                  {c ? c.en : code}
                </span>
              );
            })}
          </div>
        );
      },
    },
    {
      header: "Sites",
      render: (r) => {
        const n = locationCountByPartner[r.id] || 0;
        return n > 0
          ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">{n}</span>
          : <span className="text-slate-300">-</span>;
      },
    },
    {
      header: "Main Contact",
      render: (r) => {
        const c = mainContactByPartner[r.id];
        if (!c) return <span className="text-slate-300">-</span>;
        return (
          <div>
            <div className="text-xs font-medium text-slate-700">{c.full_name}</div>
            {c.position && <div className="text-[10px] text-slate-400">{c.position}</div>}
          </div>
        );
      },
    },
    { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      header: "",
      render: (r) => (
        <RowActions
          onEdit={() => { setEditItem(r); setShowForm(true); }}
          onArchive={() => handleArchive(r)}
          isArchived={r.status === "archived"}
          canDelete={r.status === "archived"}
          onDelete={() => handleDelete(r)}
        />
      ),
    },
  ];

  if (selectedPartner) {
    return (
      <PartnerDetail
        partner={selectedPartner}
        onBack={() => setSelectedPartner(null)}
        onUpdated={() => qc.invalidateQueries({ queryKey: ["partners"] })}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Partners / Partnerek"
        subtitle="Partner master database / Partner törzs"
        onAdd={() => { setEditItem(null); setShowForm(true); }}
        addLabel="New Partner / Új partner"
      />

      {/* Filter bar */}
      <div className="cx-glass p-3 space-y-2.5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, VAT, tax no, city..."
            className="pl-8 h-8 bg-white border-slate-300 text-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Role filter */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide w-12">Role</span>
          <FilterChip active={!filterRole} onClick={() => setFilterRole("")}>All</FilterChip>
          {ALL_ROLES.map((r) => {
            const m = ROLE_META[r];
            return (
              <FilterChip key={r} active={filterRole === r} onClick={() => setFilterRole(filterRole === r ? "" : r)}>
                {m.label} / {m.labelHu}
              </FilterChip>
            );
          })}
        </div>

        {/* Country filter */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide w-12">Country</span>
          <FilterChip active={!filterCountry} onClick={() => setFilterCountry("")}>All</FilterChip>
          {COUNTRIES.map((c) => (
            <FilterChip key={c.code} active={filterCountry === c.code} onClick={() => setFilterCountry(filterCountry === c.code ? "" : c.code)}>
              <span className="text-[10px] font-bold opacity-60 mr-0.5">{c.code}</span>{c.en}
            </FilterChip>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide w-12">Status</span>
          <FilterChip active={!filterStatus} onClick={() => setFilterStatus("")}>All</FilterChip>
          {ALL_STATUSES.map((s) => (
            <FilterChip key={s} active={filterStatus === s} onClick={() => setFilterStatus(filterStatus === s ? "" : s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </FilterChip>
          ))}
        </div>
      </div>

      {showForm && (
        <PartnerForm
          item={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["partners"] });
            setShowForm(false);
            setEditItem(null);
          }}
        />
      )}

      <div className="cx-table-wrap">
        <DataTable
          columns={columns}
          data={visiblePartners}
          isLoading={isLoading}
          onRowClick={(r) => r.status !== "archived" && setSelectedPartner(r)}
        />
      </div>
    </div>
  );
}
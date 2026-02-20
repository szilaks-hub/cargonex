import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";

const ALL_COUNTRIES = ["AT","BE","BG","CZ","DE","FR","HR","HU","IT","NL","PL","RO","RS","SI","SK","TR","UA"];

export default function CarrierAssignmentEditor({ form, carriers, isEditable, onChange }) {
  const assignments = form.carrier_assignments || [];
  const countries = form.destination_countries || [];

  // Add a new country (not yet in the list)
  const addCountry = (country) => {
    if (countries.includes(country)) return;
    const newCountries = [...countries, country];
    const newAssignments = [...assignments, { country, carrier_id: "", carrier_name: "" }];
    onChange({ destination_countries: newCountries, carrier_assignments: newAssignments });
  };

  // Remove a country and its assignment
  const removeCountry = (country) => {
    const newCountries = countries.filter(c => c !== country);
    const newAssignments = assignments.filter(a => a.country !== country);
    onChange({ destination_countries: newCountries, carrier_assignments: newAssignments });
  };

  // Update the carrier for a specific country
  const setCarrier = (country, carrierId) => {
    const carrier = carriers.find(c => c.id === carrierId);
    const newAssignments = assignments.map(a =>
      a.country === country
        ? { ...a, carrier_id: carrierId, carrier_name: carrier?.name || "" }
        : a
    );
    onChange({ carrier_assignments: newAssignments });
  };

  const availableCountries = ALL_COUNTRIES.filter(c => !countries.includes(c));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-600">Célországok & fuvarozók</label>
        {isEditable && availableCountries.length > 0 && (
          <Select onValueChange={addCountry} value="">
            <SelectTrigger className="h-7 text-xs w-48 bg-white border-dashed border-slate-300">
              <span className="flex items-center gap-1 text-slate-500"><Plus className="w-3 h-3" /> Ország hozzáadása</span>
            </SelectTrigger>
            <SelectContent>
              {availableCountries.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {countries.length === 0 && (
        <div className="text-xs text-slate-400 italic py-1">
          {isEditable ? "Nincs célország megadva. Adj hozzá egy országot." : "—"}
        </div>
      )}

      {countries.map(country => {
        const assignment = assignments.find(a => a.country === country) || {};
        return (
          <div key={country} className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
            <span className="text-xs font-bold text-slate-700 w-8 shrink-0">{country}</span>
            <div className="flex-1">
              {isEditable ? (
                <Select
                  value={assignment.carrier_id || ""}
                  onValueChange={(v) => setCarrier(country, v)}
                >
                  <SelectTrigger className="h-7 text-xs bg-white">
                    <SelectValue placeholder="— Fuvarozó —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Nincs megadva —</SelectItem>
                    {carriers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-xs text-slate-600">{assignment.carrier_name || "—"}</span>
              )}
            </div>
            {isEditable && (
              <button onClick={() => removeCountry(country)} className="text-slate-300 hover:text-red-400 shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
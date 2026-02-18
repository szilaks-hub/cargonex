import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  FileText,
  MapPin,
  ShieldCheck,
  Menu,
  X,
  ChevronRight,
  ClipboardList
} from "lucide-react";

const navItems = [
  { name: "Dashboard", nameHu: "Kezdőképernyő", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Products", nameHu: "Termékek", icon: Package, page: "Products" },
  { name: "Partners", nameHu: "Partnerek", icon: Users, page: "Partners" },
  { name: "Freight Rates", nameHu: "Fuvardíjak", icon: MapPin, page: "FreightRates" },
  { name: "Freight Sheets", nameHu: "Fuvarozási lapok", icon: ClipboardList, page: "FreightSheets" },
  { name: "Orders", nameHu: "Rendelések", icon: FileText, page: "Orders" },
  { name: "Logistics", nameHu: "Logisztika", icon: Truck, page: "Logistics" },
  { name: "Finance / Customs", nameHu: "Pénzügy / Vám", icon: ShieldCheck, page: "Finance" },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentItem = navItems.find((n) => n.page === currentPageName);

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — glass light */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRight: "1px solid rgba(46,58,90,0.10)",
          boxShadow: "4px 0 20px rgba(20,40,80,0.06)"
        }}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-5" style={{ borderBottom: "1px solid rgba(46,58,90,0.08)" }}>
          <div className="flex items-center justify-between">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_695955de68183bcabeb8b12f/3e4f22a2f_CARGONEXv.png"
              alt="CARGONEX"
              className="h-40 w-auto object-contain"
            />
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[8px] tracking-[0.4em] text-slate-400 mt-3 uppercase font-medium">
            Cargo · Logistic · Custom · For Next Step
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all duration-150 group ${
                  isActive
                    ? "text-white shadow-md"
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
                }`}
                style={isActive ? {
                  background: "linear-gradient(135deg, #e05a2b, #c0392b)",
                  boxShadow: "0 3px 12px rgba(224,90,43,0.35)"
                } : {}}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{item.name}</div>
                  <div className={`text-[10px] truncate ${isActive ? "text-orange-100" : "text-slate-400 group-hover:text-slate-500"}`}>{item.nameHu}</div>
                </div>
                {isActive && <ChevronRight className="w-3 h-3 text-orange-200 flex-shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4" style={{ borderTop: "1px solid rgba(46,58,90,0.08)" }}>
          <p className="text-[10px] text-slate-400 text-center">CARGONEX © 2026</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top bar — glass */}
        <header
          className="h-14 flex items-center px-4 lg:px-6 sticky top-0 z-30"
          style={{
            background: "rgba(235,240,248,0.80)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(46,58,90,0.10)",
            boxShadow: "0 2px 10px rgba(20,40,80,0.06)"
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-500 hover:text-slate-800 mr-3"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-semibold text-slate-800 leading-tight">
              {currentItem?.name || currentPageName}
            </h1>
            {currentItem?.nameHu && (
              <p className="text-xs text-slate-400 leading-none mt-0.5">{currentItem.nameHu}</p>
            )}
          </div>
        </header>

        {/* Page content — transparent so bg bleeds through */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
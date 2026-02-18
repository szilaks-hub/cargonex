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
  ChevronRight
} from "lucide-react";

const navItems = [
  { name: "Dashboard", nameHu: "Kezdőképernyő", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Products", nameHu: "Termékek", icon: Package, page: "Products" },
  { name: "Partners", nameHu: "Partnerek", icon: Users, page: "Partners" },
  { name: "Freight Rates", nameHu: "Fuvardíjak", icon: MapPin, page: "FreightRates" },
  { name: "Orders", nameHu: "Rendelések", icon: FileText, page: "Orders" },
  { name: "Logistics", nameHu: "Logisztika", icon: Truck, page: "Logistics" },
  { name: "Finance / Customs", nameHu: "Pénzügy / Vám", icon: ShieldCheck, page: "Finance" },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentItem = navItems.find((n) => n.page === currentPageName);

  return (
    <div className="min-h-screen flex cx-main-bg">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — dark steel */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ background: "var(--cx-sidebar)" }}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_695955de68183bcabeb8b12f/3e4f22a2f_CARGONEXv.png"
              alt="CARGONEX"
              className="h-40 w-auto object-contain"
            />
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[8px] tracking-[0.4em] text-slate-500 mt-3 uppercase font-medium">
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
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all duration-150 group ${
                  isActive
                    ? "text-white shadow-md"
                    : "text-slate-400 hover:text-white hover:bg-white/10"
                }`}
                style={isActive ? { background: "linear-gradient(135deg, #e05a2b, #c0392b)" } : {}}
              >
                <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{item.name}</div>
                  <div className={`text-[10px] truncate ${isActive ? "text-orange-100" : "text-slate-600 group-hover:text-slate-500"}`}>{item.nameHu}</div>
                </div>
                {isActive && <ChevronRight className="w-3 h-3 text-orange-200 flex-shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10">
          <p className="text-[10px] text-slate-600 text-center">CARGONEX © 2026</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b flex items-center px-4 lg:px-6 sticky top-0 z-30 shadow-sm" style={{ background: "rgba(220,225,234,0.82)", backdropFilter: "blur(10px)", borderColor: "#c0c6d3" }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-500 hover:text-slate-800 mr-3"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-semibold text-slate-800">
              {currentItem?.name || currentPageName}
            </h1>
            {currentItem?.nameHu && (
              <p className="text-xs text-slate-500 leading-none mt-0.5">{currentItem.nameHu}</p>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6" style={{ background: "transparent" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
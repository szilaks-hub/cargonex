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
  { name: "Dashboard / Kezdőképernyő", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Products / Termékek", icon: Package, page: "Products" },
  { name: "Partners / Partnerek", icon: Users, page: "Partners" },
  { name: "Freight Rates / Fuvardíjak", icon: MapPin, page: "FreightRates" },
  { name: "Orders / Rendelések", icon: FileText, page: "Orders" },
  { name: "Logistics / Logisztika", icon: Truck, page: "Logistics" },
  { name: "Finance / Customs / AEO", icon: ShieldCheck, page: "Finance" },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#131619] text-[#e6edf3] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#1a1e23] border-r border-[#2d333b] flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-[#2d333b]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_695955de68183bcabeb8b12f/3e4f22a2f_CARGONEXv.png"
                alt="CARGONEX"
                className="h-9 object-contain"
              />
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-[#8b949e] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[10px] tracking-[0.3em] text-[#8b949e] mt-2 uppercase">
            Cargo · Logistic · Custom · For Next Step
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600/20 to-blue-600/5 text-blue-400 border border-blue-500/20"
                    : "text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#22272e]"
                }`}
              >
                <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-blue-400" : "text-[#8b949e] group-hover:text-[#e6edf3]"}`} />
                <span className="truncate">{item.name}</span>
                {isActive && <ChevronRight className="w-3 h-3 ml-auto text-blue-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#2d333b]">
          <p className="text-[10px] text-[#8b949e] text-center">
            CARGONEX © 2026
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-[#1a1e23]/80 backdrop-blur-sm border-b border-[#2d333b] flex items-center px-4 lg:px-6 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-[#8b949e] hover:text-white mr-3"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-medium text-[#e6edf3]">
            {navItems.find((n) => n.page === currentPageName)?.name || currentPageName}
          </h1>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 relative">
          {/* Watermark */}
          <div className="pointer-events-none fixed inset-0 flex items-center justify-center opacity-[0.02] z-0">
            <span className="text-[20vw] font-black tracking-widest text-white select-none">
              CARGONEX
            </span>
          </div>
          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
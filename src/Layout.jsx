import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  ShieldCheck,
  Menu,
  X,
  ChevronRight,
  ClipboardList,
  FileText,
  Settings2
} from "lucide-react";

const navItems = [
  { name: "Dashboard", nameHu: "Kezdőképernyő", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Products", nameHu: "Termékek", icon: Package, page: "Products" },
  { name: "Partners", nameHu: "Partnerek", icon: Users, page: "Partners" },
  { name: "Freight Sheets", nameHu: "Díjak & Fuvarozási lapok", icon: ClipboardList, page: "FreightSheets" },
  { name: "Orderbooks", nameHu: "Rendelések", icon: FileText, page: "Orderbooks" },
  { name: "Logistics", nameHu: "Logisztika", icon: Truck, page: "Logistics" },
  { name: "Finance / Customs", nameHu: "Pénzügy / Vám", icon: ShieldCheck, page: "Finance" },
  { name: "Master Panel", nameHu: "Adatkezelés", icon: Settings2, page: "MasterPanel" },
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

      {/* Sidebar — modern light */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          background: "#ffffff",
          borderRight: "1px solid #E8ECF4",
          boxShadow: "4px 0 24px rgba(15,23,60,0.06)"
        }}
      >
        {/* Logo */}
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid #EEF0F6" }}>
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-center">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6995745b061c5cfec8978279/7ed19bd16_image.png"
                alt="CARGONEX"
                className="w-auto object-contain"
                style={{ height: "240px" }}
              />
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-600 absolute right-4"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[8px] tracking-[0.4em] mt-2 uppercase font-medium text-slate-400">
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group ${
                  isActive ? "text-white shadow-md" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
                style={isActive ? {
                  background: "linear-gradient(135deg, #3B6CF4, #2554d1)",
                  boxShadow: "0 4px 14px rgba(59,108,244,0.35)"
                } : {}}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate text-sm">{item.name}</div>
                  <div className={`text-[10px] truncate ${isActive ? "text-blue-100" : "text-slate-400"}`}>{item.nameHu}</div>
                </div>
                {isActive && <ChevronRight className="w-3 h-3 text-blue-200 flex-shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4" style={{ borderTop: "1px solid #EEF0F6" }}>
          <p className="text-[10px] text-slate-400 text-center">CARGONEX © 2026</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top bar */}
        <header
          className="h-14 flex items-center px-4 lg:px-6 sticky top-0 z-30"
          style={{
            background: "rgba(244,246,250,0.92)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid #E8ECF4",
            boxShadow: "0 2px 10px rgba(15,23,60,0.05)"
          }}
        >
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-800 mr-3">
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

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
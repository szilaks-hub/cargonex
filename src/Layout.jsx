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
  FileText
} from "lucide-react";

const navItems = [
  { name: "Dashboard", nameHu: "Kezdőképernyő", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Products", nameHu: "Termékek", icon: Package, page: "Products" },
  { name: "Partners", nameHu: "Partnerek", icon: Users, page: "Partners" },
  { name: "Freight Sheets", nameHu: "Díjak & Fuvarozási lapok", icon: ClipboardList, page: "FreightSheets" },
  { name: "Orderbooks", nameHu: "Rendelések", icon: FileText, page: "Orderbooks" },
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

      {/* Sidebar — dark modern */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          background: "rgba(11,13,20,0.99)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "4px 0 32px rgba(0,0,0,0.50)"
        }}
      >
        {/* Logo */}
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_695955de68183bcabeb8b12f/3e4f22a2f_CARGONEXv.png"
              alt="CARGONEX"
              className="w-auto object-contain"
              style={{ height: "80px" }}
            />
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[8px] tracking-[0.4em] mt-2 uppercase font-medium" style={{ color: "rgba(200,241,53,0.55)" }}>
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group`}
                style={isActive ? {
                  background: "rgba(200,241,53,0.12)",
                  borderLeft: "3px solid #c8f135",
                  paddingLeft: "calc(0.75rem - 3px)"
                } : {
                  borderLeft: "3px solid transparent",
                  paddingLeft: "calc(0.75rem - 3px)"
                }}
              >
                <item.icon className={`w-4.5 h-4.5 flex-shrink-0 w-5 h-5 ${isActive ? "" : "opacity-40 group-hover:opacity-70"}`}
                  style={{ color: isActive ? "#c8f135" : "#8896aa" }}
                />
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold truncate text-sm ${isActive ? "" : "text-slate-400 group-hover:text-slate-200"}`}
                    style={{ color: isActive ? "#c8f135" : undefined }}>
                    {item.name}
                  </div>
                  <div className="text-[10px] truncate opacity-50" style={{ color: isActive ? "#c8f135" : "#8896aa" }}>
                    {item.nameHu}
                  </div>
                </div>
                {isActive && <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-60" style={{ color: "#c8f135" }} />}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[10px] text-center" style={{ color: "rgba(136,150,170,0.5)" }}>CARGONEX © 2026</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top bar — dark */}
        <header
          className="h-14 flex items-center px-4 lg:px-6 sticky top-0 z-30"
          style={{
            background: "rgba(11,13,20,0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 2px 16px rgba(0,0,0,0.35)"
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden mr-3"
            style={{ color: "#8896aa" }}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-semibold leading-tight" style={{ color: "#eef2ff" }}>
              {currentItem?.name || currentPageName}
            </h1>
            {currentItem?.nameHu && (
              <p className="text-xs leading-none mt-0.5" style={{ color: "#8896aa" }}>{currentItem.nameHu}</p>
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
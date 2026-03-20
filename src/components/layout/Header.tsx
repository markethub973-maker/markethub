"use client";

import { Bell, Search, ChevronDown } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="h-16 flex items-center justify-between px-6 sticky top-0 z-30" style={{ backgroundColor: "#FFFCF7", borderBottom: "1px solid rgba(245,215,160,0.25)" }}>
      <div>
        <h1 className="text-xl font-bold" style={{ color: "#292524" }}>{title}</h1>
        {subtitle && <p className="text-xs" style={{ color: "#A8967E" }}>{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:flex items-center">
          <Search className="absolute left-3 w-4 h-4" style={{ color: "#C4AA8A" }} />
          <input
            type="text"
            placeholder="Search channels, videos..."
            className="pl-9 pr-4 py-2 text-sm rounded-lg w-56 focus:outline-none"
            style={{ backgroundColor: "#F5EFE6", border: "1px solid rgba(245,215,160,0.3)", color: "#292524" }}
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg transition-colors" style={{ color: "#78614E" }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.15)")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: "#F59E0B" }} />
        </button>

        {/* Avatar */}
        <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg transition-colors"
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.15)")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
            VS
          </div>
          <span className="text-sm font-medium hidden md:block" style={{ color: "#5C4A35" }}>My Account</span>
          <ChevronDown className="w-3.5 h-3.5" style={{ color: "#A8967E" }} />
        </button>
      </div>
    </header>
  );
}

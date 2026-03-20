"use client";

import { Bell, Search, ChevronDown, LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [username, setUsername] = useState("admin");
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const u = localStorage.getItem("mh_user");
    if (u) setUsername(u);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      router.push(`/videos?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("mh_auth");
    localStorage.removeItem("mh_user");
    router.push("/login");
  };

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
            placeholder="Cauta videoclipuri... (Enter)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            className="pl-9 pr-4 py-2 text-sm rounded-lg w-56 focus:outline-none"
            style={{ backgroundColor: "#F5EFE6", border: "1px solid rgba(245,215,160,0.3)", color: "#292524" }}
            onFocus={(e) => (e.currentTarget.style.border = "1px solid #F59E0B")}
            onBlur={(e) => (e.currentTarget.style.border = "1px solid rgba(245,215,160,0.3)")}
          />
        </div>

        {/* Notifications */}
        <button
          type="button"
          title="Notificari"
          aria-label="Notificari"
          className="relative p-2 rounded-lg transition-colors"
          style={{ color: "#78614E" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.15)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: "#F59E0B" }} />
        </button>

        {/* Avatar + Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg transition-colors"
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.15)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
              {username.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-sm font-medium hidden md:block" style={{ color: "#5C4A35" }}>{username}</span>
            <ChevronDown className="w-3.5 h-3.5" style={{ color: "#A8967E" }} />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div
              className="absolute right-0 top-full mt-1 w-44 rounded-xl py-1 z-50"
              style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.35)", boxShadow: "0 8px 24px rgba(120,97,78,0.15)" }}
            >
              <div className="px-4 py-2" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
                <p className="text-xs font-semibold" style={{ color: "#292524" }}>{username}</p>
                <p className="text-xs" style={{ color: "#C4AA8A" }}>Free Plan</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowMenu(false); router.push("/settings"); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors"
                style={{ color: "#78614E" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.12)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <User className="w-3.5 h-3.5" />
                Contul meu
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors"
                style={{ color: "#ef4444" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

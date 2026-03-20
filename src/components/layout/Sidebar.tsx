"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  PlayCircle,
  Users,
  TrendingUp,
  BarChart3,
  Settings,
  Zap,
  LogOut,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/videos", label: "Top Videos", icon: PlayCircle },
  { href: "/channels", label: "Channels", icon: Users },
  { href: "/trending", label: "Trending", icon: TrendingUp },
  { href: "/competitors", label: "Competitors", icon: BarChart3 },
  { href: "/alerts", label: "Alerts", icon: Bell },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("mh_auth");
    localStorage.removeItem("mh_user");
    router.push("/login");
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col z-40" style={{ backgroundColor: "#1C1814" }}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5" style={{ borderBottom: "1px solid rgba(245,215,160,0.1)" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight" style={{ color: "#FFF8F0" }}>ViralStat</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              )}
              style={active ? {
                backgroundColor: "rgba(245,158,11,0.15)",
                color: "#F59E0B",
                border: "1px solid rgba(245,158,11,0.3)"
              } : {
                color: "#A8967E",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.color = "#FFF8F0";
                  e.currentTarget.style.backgroundColor = "rgba(255,248,240,0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.color = "#A8967E";
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(245,215,160,0.1)" }}>
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={{ color: "#A8967E" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#FFF8F0";
            e.currentTarget.style.backgroundColor = "rgba(255,248,240,0.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#A8967E";
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
        <div className="mt-4 mx-1 p-3 rounded-lg" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <p className="text-xs font-medium" style={{ color: "#F5D7A0" }}>Free Plan</p>
          <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>3/10 tracked channels</p>
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,248,240,0.1)" }}>
            <div className="h-full w-[30%] rounded-full" style={{ background: "linear-gradient(90deg, #F59E0B, #D97706)" }} />
          </div>
          <button className="mt-2.5 w-full py-1.5 rounded-md text-xs font-bold transition-colors" style={{ backgroundColor: "#F59E0B", color: "#1C1814" }}>
            Upgrade
          </button>
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="mt-2 flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium w-full transition-all"
          style={{ color: "#A8967E" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#ef4444";
            e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#A8967E";
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlayCircle,
  Users,
  TrendingUp,
  BarChart3,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/videos", label: "Top Videos", icon: PlayCircle },
  { href: "/channels", label: "Channels", icon: Users },
  { href: "/trending", label: "Trending", icon: TrendingUp },
  { href: "/competitors", label: "Competitors", icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0f0e1a] flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#39D3B8] to-[#4F4DF0] flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">ViralStat</span>
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
                active
                  ? "bg-[#39D3B8]/15 text-[#39D3B8] border border-[#39D3B8]/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-white/10">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
        <div className="mt-4 mx-1 p-3 rounded-lg bg-gradient-to-br from-[#4F4DF0]/20 to-[#39D3B8]/20 border border-white/10">
          <p className="text-xs text-gray-300 font-medium">Free Plan</p>
          <p className="text-xs text-gray-500 mt-0.5">3/10 tracked channels</p>
          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full w-[30%] bg-gradient-to-r from-[#39D3B8] to-[#4F4DF0] rounded-full" />
          </div>
          <button className="mt-2.5 w-full py-1.5 rounded-md bg-[#39D3B8] text-[#0f0e1a] text-xs font-bold hover:bg-[#39D3B8]/90 transition-colors">
            Upgrade
          </button>
        </div>
      </div>
    </aside>
  );
}

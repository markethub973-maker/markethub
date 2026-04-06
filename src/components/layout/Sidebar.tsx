"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  Newspaper,
  Map,
  LineChart,
  Library,
  Megaphone,
  Mail,
  UserSquare2,
  Sparkles,
  CalendarDays,
  Target,
  Instagram,
  Shield,
  ChevronDown,
  Puzzle,
  Search,
  Database,
  Hash,
  Link2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navGroups = [
  {
    label: "YouTube Analytics",
    icon: PlayCircle,
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/my-channel", label: "My Channel", icon: PlayCircle },
      { href: "/videos", label: "Top Videos", icon: PlayCircle },
      { href: "/global", label: "Global Trending", icon: Map },
    ],
  },
  {
    label: "Social Platforms",
    icon: Users,
    items: [
      { href: "/channels", label: "Channels", icon: Users },
      { href: "/instagram", label: "My Instagram", icon: Instagram },
      { href: "/instagram-search", label: "IG Search", icon: Instagram },
      { href: "/meta-insights", label: "Meta Insights", icon: BarChart3 },
      { href: "/tiktok", label: "TikTok", icon: Zap },
    ],
  },
  {
    label: "Market Research",
    icon: TrendingUp,
    items: [
      { href: "/research", label: "Research Hub", icon: Search },
      { href: "/marketing", label: "Marketing Agent", icon: Megaphone },
      { href: "/lead-finder", label: "Lead Finder", icon: Target },
      { href: "/leads", label: "Leads Database", icon: Database },
      { href: "/trending", label: "Trending", icon: TrendingUp },
      { href: "/competitors", label: "Competitors", icon: BarChart3 },
      { href: "/trends", label: "Google Trends", icon: LineChart },
      { href: "/news", label: "News", icon: Newspaper },
    ],
  },
  {
    label: "Content Tools",
    icon: Library,
    items: [
      { href: "/ads-library", label: "Ads Library", icon: Library },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/captions", label: "AI Captions", icon: Sparkles },
      { href: "/hashtags", label: "Hashtag Manager", icon: Hash },
      { href: "/bio", label: "Link in Bio", icon: Link2 },
      { href: "/monthly-report", label: "Monthly Report AI", icon: BarChart3 },
      { href: "/campaigns", label: "Campaigns", icon: Target },
    ],
  },
  {
    label: "Other",
    icon: Bell,
    items: [
      { href: "/alerts", label: "Alerts", icon: Bell },
      { href: "/email-reports", label: "Email Reports", icon: Mail },
      { href: "/clients", label: "Multi-Account", icon: UserSquare2 },
      { href: "/ai-hub", label: "AI Hub", icon: Sparkles },
    ],
  },
];

type Profile = {
  plan: string;
  is_admin: boolean;
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["YouTube Analytics"]) // Default: YouTube Analytics expanded
  );

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("plan, is_admin")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data);
    });
  }, []);

  const toggleGroup = (groupLabel: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupLabel)) {
      newExpanded.delete(groupLabel);
    } else {
      newExpanded.add(groupLabel);
    }
    setExpandedGroups(newExpanded);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const planLabel = profile?.plan
    ? profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1) + " Plan"
    : "Free Plan";

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col z-40" style={{ backgroundColor: "#1C1814" }}>
      {/* Logo */}
      <div data-tour="sidebar-logo" className="flex items-center gap-2 px-6 py-5" style={{ borderBottom: "1px solid rgba(245,215,160,0.1)" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight" style={{ color: "#FFF8F0" }}>MarketHub Pro</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {navGroups.map(({ label: groupLabel, icon: GroupIcon, items }) => {
          const isExpanded = expandedGroups.has(groupLabel);
          const hasActiveItem = items.some(item => pathname === item.href);

          return (
            <div key={groupLabel} className="mb-2">
              {/* Group Button */}
              <button
                onClick={() => toggleGroup(groupLabel)}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={hasActiveItem ? {
                  backgroundColor: "rgba(245,158,11,0.15)",
                  color: "#F59E0B",
                  border: "1px solid rgba(245,158,11,0.3)"
                } : {
                  color: "#A8967E",
                }}
                onMouseEnter={(e) => {
                  if (!hasActiveItem) {
                    e.currentTarget.style.color = "#FFF8F0";
                    e.currentTarget.style.backgroundColor = "rgba(255,248,240,0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!hasActiveItem) {
                    e.currentTarget.style.color = "#A8967E";
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <GroupIcon className="w-4 h-4" />
                <span className="flex-1 text-left">{groupLabel}</span>
                <ChevronDown
                  className="w-4 h-4 transition-transform"
                  style={{transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)"}}
                />
              </button>

              {/* Group Items */}
              {isExpanded && (
                <div className="mt-1 ml-2 space-y-1 border-l border-amber-800/30 pl-2">
                  {items.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href;
                    return (
                      <Link
                        key={href}
                        href={href}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
                        style={active ? {
                          backgroundColor: "rgba(245,158,11,0.2)",
                          color: "#F59E0B",
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
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(245,215,160,0.1)" }}>
        {/* Admin Link — only for admins */}
        {profile?.is_admin && (
          <Link
            href="/dashboard/admin"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all mb-2"
            style={pathname === "/dashboard/admin" ? {
              backgroundColor: "rgba(245,158,11,0.15)",
              color: "#F59E0B",
              border: "1px solid rgba(245,158,11,0.3)",
            } : {
              color: "#A8967E",
            }}
            onMouseEnter={(e) => {
              if (pathname !== "/dashboard/admin") {
                e.currentTarget.style.color = "#FFF8F0";
                e.currentTarget.style.backgroundColor = "rgba(255,248,240,0.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (pathname !== "/dashboard/admin") {
                e.currentTarget.style.color = "#A8967E";
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            <Shield className="w-4 h-4" />
            Admin
          </Link>
        )}

        <Link
          href="/integrations"
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
          <Puzzle className="w-4 h-4" />
          Integrations
        </Link>

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

        {/* Plan box — hidden for admin */}
        {!profile?.is_admin && (
          <div className="mt-4 mx-1 p-3 rounded-lg" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <p className="text-xs font-medium" style={{ color: "#F5D7A0" }}>{planLabel}</p>
            <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>3/10 tracked channels</p>
            <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,248,240,0.1)" }}>
              <div className="h-full w-[30%] rounded-full" style={{ background: "linear-gradient(90deg, #F59E0B, #D97706)" }} />
            </div>
            <div className="mt-2 flex gap-1">
              <Link href="/dashboard/subscription" className="flex-1 py-1.5 rounded-md text-xs font-medium text-center transition-colors" style={{ color: "#A8967E" }}>
                Plan
              </Link>
              <Link href="/dashboard/billing" className="flex-1 py-1.5 rounded-md text-xs font-medium text-center transition-colors" style={{ color: "#A8967E" }}>
                Billing
              </Link>
            </div>
            <Link href="/upgrade" className="mt-1 block w-full py-1.5 rounded-md text-xs font-bold text-center transition-colors" style={{ backgroundColor: "#F59E0B", color: "#1C1814" }}>
              Upgrade
            </Link>
          </div>
        )}

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

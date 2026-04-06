"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, PlayCircle, Users, TrendingUp, BarChart3,
  Settings, Zap, LogOut, Bell, Newspaper, Map, LineChart,
  Library, Megaphone, Mail, UserSquare2, Sparkles, CalendarDays,
  Target, Instagram, Shield, ChevronDown, Puzzle, Search,
  Database, Hash, Link2, Lock, X, ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  canAccessRoute, getRouteGate, PLAN_LABELS, PLAN_COLORS, PLAN_PRICES,
  PLAN_ORDER, plansWithAccess, type PlanId,
} from "@/lib/plan-features";

// ── Nav structure ─────────────────────────────────────────────────────────────
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

interface Profile {
  subscription_plan: string;
  plan: string;
  is_admin: boolean;
}

// ── Upgrade Modal ─────────────────────────────────────────────────────────────
function UpgradeModal({
  href,
  userPlan,
  onClose,
}: {
  href: string;
  userPlan: string;
  onClose: () => void;
}) {
  const gate = getRouteGate(href);
  if (!gate) return null;

  const qualifying = plansWithAccess(href).filter(p => p !== "free_test");
  const minPlan = qualifying[0] as PlanId | undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: "#1C1814", border: "1px solid rgba(245,215,160,0.15)" }}
        onClick={e => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} aria-label="Close"
          className="absolute top-4 right-4 p-1 rounded-lg"
          style={{ color: "#A8967E" }}>
          <X size={16} />
        </button>

        {/* Lock icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <Lock size={24} style={{ color: "#F59E0B" }} />
          </div>
        </div>

        <h3 className="text-lg font-bold text-center mb-1" style={{ color: "#FFF8F0" }}>
          {gate.label}
        </h3>
        <p className="text-sm text-center mb-1" style={{ color: "#A8967E" }}>
          {gate.description}
        </p>

        {/* Current plan badge */}
        <p className="text-xs text-center mb-4" style={{ color: "#78614E" }}>
          Your current plan:{" "}
          <span className="font-bold" style={{ color: PLAN_COLORS[userPlan as PlanId] ?? "#F59E0B" }}>
            {PLAN_LABELS[userPlan as PlanId] ?? userPlan}
          </span>
        </p>

        {/* Plans that include this feature */}
        <div className="space-y-2 mb-5">
          {qualifying.map(p => {
            const color = PLAN_COLORS[p];
            const price = PLAN_PRICES[p];
            return (
              <div key={p} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ backgroundColor: `${color}12`, border: `1px solid ${color}30` }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-sm font-semibold flex-1" style={{ color }}>
                  {PLAN_LABELS[p]}
                </span>
                <span className="text-xs font-bold" style={{ color: "#FFF8F0" }}>
                  ${price}<span className="font-normal text-xs" style={{ color: "#A8967E" }}>/mo</span>
                </span>
              </div>
            );
          })}
        </div>

        <Link
          href={`/register?plan=${minPlan ?? "lite"}`}
          onClick={onClose}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold"
          style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#1C1814" }}
        >
          Upgrade Now <ArrowRight size={15} />
        </Link>
        <button type="button" onClick={onClose}
          className="mt-2 w-full py-2 text-xs"
          style={{ color: "#78614E" }}>
          Maybe later
        </button>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["YouTube Analytics"])
  );
  const [lockedModal, setLockedModal] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("subscription_plan, plan, is_admin")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data);
    });
  }, []);

  const userPlan = profile?.subscription_plan || profile?.plan || "free_test";

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(groupLabel) ? next.delete(groupLabel) : next.add(groupLabel);
      return next;
    });
  };

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    if (!canAccessRoute(userPlan, href)) {
      e.preventDefault();
      setLockedModal(href);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const planLabel = PLAN_LABELS[userPlan as PlanId] ?? "Free Plan";

  return (
    <>
      <aside
        className="fixed left-0 top-0 h-screen w-64 flex flex-col z-40"
        style={{ backgroundColor: "#1C1814" }}
      >
        {/* Logo */}
        <div
          data-tour="sidebar-logo"
          className="flex items-center gap-2 px-6 py-5"
          style={{ borderBottom: "1px solid rgba(245,215,160,0.1)" }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ color: "#FFF8F0" }}>MarketHub Pro</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {navGroups.map(({ label: groupLabel, icon: GroupIcon, items }) => {
            const isExpanded = expandedGroups.has(groupLabel);
            const hasActiveItem = items.some(item => pathname === item.href);
            // Group is "locked" if all items are locked
            const allLocked = items.every(item => !canAccessRoute(userPlan, item.href));
            const someLocked = items.some(item => !canAccessRoute(userPlan, item.href));

            return (
              <div key={groupLabel} className="mb-2">
                <button
                  type="button"
                  onClick={() => toggleGroup(groupLabel)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={hasActiveItem ? {
                    backgroundColor: "rgba(245,158,11,0.15)",
                    color: "#F59E0B",
                    border: "1px solid rgba(245,158,11,0.3)",
                  } : allLocked ? {
                    color: "#4A3F35",
                  } : {
                    color: "#A8967E",
                  }}
                  onMouseEnter={e => {
                    if (!hasActiveItem) e.currentTarget.style.backgroundColor = "rgba(255,248,240,0.04)";
                  }}
                  onMouseLeave={e => {
                    if (!hasActiveItem) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <GroupIcon className="w-4 h-4" />
                  <span className="flex-1 text-left">{groupLabel}</span>
                  {someLocked && !allLocked && (
                    <Lock className="w-3 h-3 opacity-40" />
                  )}
                  <ChevronDown
                    className="w-4 h-4 transition-transform"
                    style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                  />
                </button>

                {isExpanded && (
                  <div className="mt-1 ml-2 space-y-1 border-l pl-2" style={{ borderColor: "rgba(120,97,78,0.3)" }}>
                    {items.map(({ href, label, icon: Icon }) => {
                      const active = pathname === href;
                      const locked = !canAccessRoute(userPlan, href);
                      const gate = getRouteGate(href);

                      if (locked) {
                        return (
                          <button
                            type="button"
                            key={href}
                            onClick={e => { e.preventDefault(); setLockedModal(href); }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
                            style={{ color: "#3D3028", cursor: "pointer" }}
                            title={`Requires ${gate ? PLAN_LABELS[gate.minPlan] : "upgrade"} plan`}
                            onMouseEnter={e => {
                              e.currentTarget.style.color = "#6B5A4E";
                              e.currentTarget.style.backgroundColor = "rgba(255,248,240,0.03)";
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.color = "#3D3028";
                              e.currentTarget.style.backgroundColor = "transparent";
                            }}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="flex-1 text-left">{label}</span>
                            <Lock className="w-3 h-3 flex-shrink-0" style={{ color: "#F59E0B", opacity: 0.5 }} />
                          </button>
                        );
                      }

                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={e => handleNavClick(href, e)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
                          style={active ? {
                            backgroundColor: "rgba(245,158,11,0.2)",
                            color: "#F59E0B",
                          } : {
                            color: "#A8967E",
                          }}
                          onMouseEnter={e => {
                            if (!active) {
                              e.currentTarget.style.color = "#FFF8F0";
                              e.currentTarget.style.backgroundColor = "rgba(255,248,240,0.05)";
                            }
                          }}
                          onMouseLeave={e => {
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
          {profile?.is_admin && (
            <Link
              href="/dashboard/admin"
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all mb-2"
              style={pathname === "/dashboard/admin" ? {
                backgroundColor: "rgba(245,158,11,0.15)",
                color: "#F59E0B",
                border: "1px solid rgba(245,158,11,0.3)",
              } : { color: "#A8967E" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#FFF8F0"; e.currentTarget.style.backgroundColor = "rgba(255,248,240,0.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#A8967E"; e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              <Shield className="w-4 h-4" />
              Admin
            </Link>
          )}

          <Link
            href="/integrations"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ color: "#A8967E" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#FFF8F0"; e.currentTarget.style.backgroundColor = "rgba(255,248,240,0.05)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#A8967E"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <Puzzle className="w-4 h-4" />
            Integrations
          </Link>

          <Link
            href="/settings"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ color: "#A8967E" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#FFF8F0"; e.currentTarget.style.backgroundColor = "rgba(255,248,240,0.05)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#A8967E"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>

          {/* Plan box */}
          {!profile?.is_admin && (
            <div className="mt-4 mx-1 p-3 rounded-lg"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: PLAN_COLORS[userPlan as PlanId] ?? "#F59E0B" }} />
                <p className="text-xs font-bold" style={{ color: "#F5D7A0" }}>{planLabel}</p>
              </div>
              <div className="mt-2 flex gap-1">
                <Link href="/dashboard/subscription"
                  className="flex-1 py-1.5 rounded-md text-xs font-medium text-center"
                  style={{ color: "#A8967E" }}>
                  Plan
                </Link>
                <Link href="/dashboard/billing"
                  className="flex-1 py-1.5 rounded-md text-xs font-medium text-center"
                  style={{ color: "#A8967E" }}>
                  Billing
                </Link>
              </div>
              <Link href="/upgrade"
                className="mt-1 block w-full py-1.5 rounded-md text-xs font-bold text-center"
                style={{ backgroundColor: "#F59E0B", color: "#1C1814" }}>
                Upgrade
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium w-full transition-all"
            style={{ color: "#A8967E" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#A8967E"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Upgrade Modal (rendered outside aside so it overlays everything) */}
      {lockedModal && (
        <UpgradeModal
          href={lockedModal}
          userPlan={userPlan}
          onClose={() => setLockedModal(null)}
        />
      )}
    </>
  );
}

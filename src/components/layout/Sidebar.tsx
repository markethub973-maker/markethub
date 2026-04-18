"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, PlayCircle, Users, TrendingUp, BarChart3,
  Settings, Zap, LogOut, Bell, Newspaper, LineChart,
  Library, Megaphone, Mail, UserSquare2, Sparkles, CalendarDays,
  Target, Instagram, Shield, ChevronDown, Puzzle, Search,
  Database, Hash, Link2, Lock, X, ArrowRight, HardDrive, Tag, ShoppingBag,
  UserCheck, FileText, Linkedin, UserPlus, Clock, Gift, Calculator, Palette, Key, Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/context/ThemeContext";
import { useTheme as useOldTheme, THEMES as OLD_THEMES } from "@/components/ThemeProvider";

// Map preset IDs to their full custom color equivalents
const PRESET_COLORS: Record<string, { primary: string; accent: string; bg: string; surface: string; text: string; sidebar: string; sidebarText: string }> = {
  amber:           { primary: "#F59E0B", accent: "#EC8054", bg: "#FFFCF7", surface: "#FFFFFF", text: "#2D2620", sidebar: "#3D2B10", sidebarText: "#FFF8F0" },
  "amber-dark":    { primary: "#F59E0B", accent: "#D97706", bg: "#0d0b1e", surface: "#1a1333", text: "#EEEEEEF0", sidebar: "#0d0b1e", sidebarText: "#FFF8F0" },
  "high-contrast": { primary: "#FF9500", accent: "#FF6B00", bg: "#000000", surface: "#111111", text: "#FFFFFF", sidebar: "#000000", sidebarText: "#FFFFFF" },
  emerald:         { primary: "#10B981", accent: "#F472B6", bg: "#F6FDF9", surface: "#FFFFFF", text: "#1A2E23", sidebar: "#0F2A23", sidebarText: "#E1F5EE" },
  indigo:          { primary: "#818CF8", accent: "#FB923C", bg: "#F6F5FF", surface: "#FFFFFF", text: "#1E1B4B", sidebar: "#1E1B4B", sidebarText: "#EEEDFE" },
  mono:            { primary: "#404040", accent: "#84CC16", bg: "#FCFCFC", surface: "#FFFFFF", text: "#171717", sidebar: "#0A0A09", sidebarText: "#FCFCFC" },
};

function ThemeSwitcherInline() {
  const { theme: oldTheme, setTheme: setOldTheme, customColors, setCustomColors } = useOldTheme();
  const [open, setOpen] = useState(false);

  // Sync customColors display with active preset
  const displayColors = oldTheme !== "custom" && PRESET_COLORS[oldTheme]
    ? { ...customColors, ...PRESET_COLORS[oldTheme] }
    : customColors;

  const selectPreset = (id: string) => {
    setOldTheme(id as Parameters<typeof setOldTheme>[0]);
    if (PRESET_COLORS[id]) {
      setCustomColors({
        primary: PRESET_COLORS[id].primary,
        accent: PRESET_COLORS[id].accent,
        bg: PRESET_COLORS[id].bg,
        surface: PRESET_COLORS[id].surface,
        text: PRESET_COLORS[id].text,
        sidebar: PRESET_COLORS[id].sidebar,
        sidebarText: PRESET_COLORS[id].sidebarText,
      });
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all w-full"
        style={{ color: "rgba(255,248,240,0.6)" }}
      >
        <Palette className="w-4 h-4" />
        Theme
      </button>
      {open && (
        <div className="absolute left-full bottom-0 ml-2 p-3 rounded-xl w-72 z-50 max-h-[80vh] overflow-y-auto"
          style={{ background: "#1C1814", border: "1px solid rgba(245,215,160,0.15)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>

          {/* Presets */}
          <p className="text-xs font-bold mb-2" style={{ color: "#D4A76A" }}>Presets</p>
          <div className="grid grid-cols-3 gap-1 mb-3">
            {OLD_THEMES.filter(t => !t.isCustom).map(t => (
              <button key={t.id} onClick={() => selectPreset(t.id)}
                className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-[10px]"
                style={{ color: oldTheme === t.id ? "#F59E0B" : "rgba(255,248,240,0.6)", background: oldTheme === t.id ? "rgba(245,158,11,0.1)" : "transparent", border: oldTheme === t.id ? "1px solid rgba(245,158,11,0.3)" : "1px solid transparent" }}>
                <div className="w-4 h-4 rounded-full" style={{ background: t.primary }} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Custom Colors — synced with preset */}
          <p className="text-xs font-bold mb-2" style={{ color: "#D4A76A" }}>Customize</p>
          {[
            { label: "Primary", key: "primary" as const },
            { label: "Accent", key: "accent" as const },
            { label: "Background", key: "bg" as const },
            { label: "Surface", key: "surface" as const },
            { label: "Text", key: "text" as const },
            { label: "Sidebar BG", key: "sidebar" as const },
            { label: "Sidebar Text", key: "sidebarText" as const },
          ].map(c => (
            <div key={c.key} className="flex items-center gap-2 mb-1.5">
              <input type="color" value={displayColors[c.key]}
                onChange={e => { setOldTheme("custom"); setCustomColors({ ...displayColors, [c.key]: e.target.value }); }}
                className="w-6 h-6 rounded cursor-pointer border-0" style={{ background: "transparent" }} />
              <span className="text-xs" style={{ color: "rgba(255,248,240,0.7)" }}>{c.label}</span>
              <span className="text-[10px] ml-auto" style={{ color: "rgba(255,248,240,0.4)" }}>{displayColors[c.key]}</span>
            </div>
          ))}

          <button onClick={() => setOpen(false)} className="w-full mt-2 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}
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
      { href: "/channels", label: "Channels", icon: Users },
    ],
  },
  {
    label: "Social Platforms",
    icon: Users,
    items: [
      { href: "/instagram", label: "My Instagram", icon: Instagram },
      { href: "/instagram-search", label: "IG Search", icon: Instagram },
      { href: "/meta-insights", label: "Meta Insights", icon: BarChart3 },
      { href: "/tiktok", label: "TikTok", icon: Zap },
      { href: "/linkedin", label: "LinkedIn", icon: Linkedin },
    ],
  },
  {
    label: "Discover",
    icon: TrendingUp,
    items: [
      { href: "/competitors", label: "Competitors", icon: BarChart3 },
      { href: "/ads-library", label: "Ads Library", icon: Library },
      { href: "/trends", label: "Trends", icon: LineChart },
      { href: "/news", label: "News", icon: Newspaper },
      { href: "/social-listening", label: "Social Listening", icon: Bell },
    ],
  },
  {
    label: "Research & Leads",
    icon: Target,
    items: [
      { href: "/research", label: "Research Hub", icon: Search },
      { href: "/lead-finder", label: "Lead Finder", icon: Megaphone },
      { href: "/leads", label: "Leads Database", icon: Database },
      { href: "/ai-hub", label: "AI Hub", icon: Sparkles },
    ],
  },
  {
    label: "Content & Planning",
    icon: CalendarDays,
    items: [
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/captions", label: "AI Captions", icon: Sparkles },
      { href: "/studio/image", label: "AI Image Studio", icon: Sparkles },
      { href: "/studio/video", label: "AI Video Studio", icon: Sparkles },
      { href: "/studio/audio", label: "AI Audio Studio", icon: Sparkles },
      { href: "/studio/assets", label: "Asset Library", icon: HardDrive },
      { href: "/studio/reels", label: "Reels Script Studio", icon: Sparkles },
      { href: "/studio/queue", label: "Publish Queue", icon: Clock },
      { href: "/studio/campaign", label: "Campaign Auto-Pilot", icon: Sparkles },
      { href: "/studio/repurpose", label: "Content Repurposer", icon: Sparkles },
      { href: "/studio/thumbnail", label: "Thumbnail Generator", icon: Sparkles },
      { href: "/studio/ab-winner", label: "A/B Winner Picker", icon: Sparkles },
      { href: "/studio/recycle", label: "Post Recycler", icon: Sparkles },
      { href: "/studio/video-caption", label: "Video → Caption", icon: Sparkles },
      { href: "/studio/hooks", label: "Hook Library", icon: Sparkles },
      { href: "/studio/content-gap", label: "Content Gap Analyzer", icon: Sparkles },
      { href: "/studio/hashtag-scan", label: "Hashtag Scanner", icon: Sparkles },
      { href: "/studio/lead-enrich", label: "Lead Enrichment", icon: Sparkles },
      { href: "/brand/voice", label: "Brand Voice", icon: Sparkles },
      { href: "/brand/strategy", label: "Content Strategy", icon: Sparkles },
      { href: "/hashtags", label: "Hashtag Manager", icon: Hash },
      { href: "/bio", label: "Link in Bio", icon: Link2 },
      { href: "/monthly-report", label: "Performance Report", icon: BarChart3 },
    ],
  },
  {
    label: "Assets & Storage",
    icon: HardDrive,
    items: [
      { href: "/assets", label: "All Assets", icon: HardDrive },
    ],
  },
  {
    label: "Clients",
    icon: UserSquare2,
    items: [
      { href: "/clients", label: "Multi-Account", icon: UserSquare2 },
      { href: "/campaigns", label: "Campaigns", icon: Target },
      { href: "/proposals", label: "Proposals", icon: FileText },
      { href: "/influencers", label: "Influencer DB", icon: UserPlus },
      { href: "/email-reports", label: "Activity Reports", icon: Mail },
      { href: "/alerts", label: "Alerts", icon: Bell },
      { href: "/affiliate", label: "Affiliate Hub", icon: Tag },
      { href: "/trending-alerts", label: "Trending Products", icon: ShoppingBag },
    ],
  },
  {
    label: "Agency",
    icon: UserCheck,
    items: [
      { href: "/team", label: "Team", icon: UserCheck },
      { href: "/time-tracking", label: "Time Tracking", icon: Clock },
      { href: "/roi-calculator", label: "ROI Calculator", icon: Calculator },
      { href: "/referral", label: "Referral", icon: Gift },
      { href: "/dashboard/white-label", label: "White-label", icon: Palette },
      { href: "/api-keys", label: "API Keys", icon: Key },
      { href: "/email-campaigns", label: "Email Campaigns", icon: Send },
      { href: "/dashboard/automations", label: "Automations", icon: Zap },
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
  const { theme } = useTheme();
  const sidebarTextColor = theme.textSidebar || "#FFF8F0";
  const sidebarTextMuted = `color-mix(in srgb, ${sidebarTextColor} 60%, transparent)`;
  const sidebarTextDim = `color-mix(in srgb, ${sidebarTextColor} 40%, transparent)`;

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
        style={{ backgroundColor: "var(--color-surface-dark)", border: "1px solid rgba(245,215,160,0.15)" }}
        onClick={e => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} aria-label="Close"
          className="absolute top-4 right-4 p-1 rounded-lg"
          style={{ color: sidebarTextMuted }}>
          <X size={16} />
        </button>

        {/* Lock icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <Lock size={24} style={{ color: "var(--color-primary)" }} />
          </div>
        </div>

        <h3 className="text-lg font-bold text-center mb-1" style={{ color: sidebarTextColor }}>
          {gate.label}
        </h3>
        <p className="text-sm text-center mb-1" style={{ color: sidebarTextMuted }}>
          {gate.description}
        </p>

        {/* Current plan badge */}
        <p className="text-xs text-center mb-4" style={{ color: sidebarTextDim }}>
          Your current plan:{" "}
          <span className="font-bold" style={{ color: PLAN_COLORS[userPlan as PlanId] ?? "var(--color-primary)" }}>
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
                <span className="text-xs font-bold" style={{ color: sidebarTextColor }}>
                  ${price}<span className="font-normal text-xs" style={{ color: sidebarTextMuted }}>/mo</span>
                </span>
              </div>
            );
          })}
        </div>

        <Link
          href={`/register?plan=${minPlan ?? "lite"}`}
          onClick={onClose}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold"
          style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "var(--color-surface-dark)" }}
        >
          Upgrade Now <ArrowRight size={15} />
        </Link>
        <button type="button" onClick={onClose}
          className="mt-2 w-full py-2 text-xs"
          style={{ color: sidebarTextDim }}>
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
  const { theme } = useTheme();
  const sidebarTextColor = theme.textSidebar || "#FFF8F0";
  const sidebarTextMuted = `color-mix(in srgb, ${sidebarTextColor} 60%, transparent)`;
  const sidebarTextDim = `color-mix(in srgb, ${sidebarTextColor} 40%, transparent)`;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["YouTube Analytics"])
  );
  const [lockedModal, setLockedModal] = useState<string | null>(null);

  useEffect(() => {
    // Admin sessions use cookie auth, not Supabase auth — grant enterprise access directly
    if (typeof window !== "undefined" && localStorage.getItem("admin_authenticated") === "true") {
      setProfile({ plan: "enterprise", subscription_plan: "enterprise", is_admin: true });
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("plan, is_admin")
        .eq("id", user.id)
        .single();
      if (data) setProfile({ ...data, subscription_plan: data.plan });
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

  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 flex items-center justify-center rounded-xl"
        style={{ backgroundColor: "var(--color-surface-dark)", border: "1px solid rgba(245,215,160,0.2)" }}
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <svg width="20" height="20" fill="none" stroke="#F5D7A0" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="17" y2="6" />
          <line x1="3" y1="12" x2="17" y2="12" />
          <line x1="3" y1="18" x2="17" y2="18" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen w-64 flex flex-col z-40 transition-transform duration-300 sidebar-glass
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Logo */}
        <div
          data-tour="sidebar-logo"
          className="flex items-center gap-2 px-6 py-5"
          style={{ borderBottom: "1px solid rgba(245,215,160,0.1)" }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))" }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight flex-1" style={{ color: sidebarTextColor }}>MarketHub Pro</span>
          <button
            type="button"
            className="md:hidden p-1 rounded-lg"
            style={{ color: sidebarTextMuted }}
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
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
                    color: "var(--color-primary)",
                    border: "1px solid rgba(245,158,11,0.3)",
                  } : allLocked ? {
                    color: "#4A3F35",
                  } : {
                    color: sidebarTextMuted,
                  }}
                  onMouseEnter={e => {
                    if (!hasActiveItem) e.currentTarget.style.backgroundColor = "rgba(255,248,240,0.04)";
                  }}
                  onMouseLeave={e => {
                    if (!hasActiveItem) e.currentTarget.style.removeProperty("background-color");
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
                              e.currentTarget.style.removeProperty("background-color");
                            }}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="flex-1 text-left">{label}</span>
                            <Lock className="w-3 h-3 flex-shrink-0" style={{ color: "var(--color-primary)", opacity: 0.5 }} />
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
                            color: "var(--color-primary)",
                          } : {
                            color: sidebarTextMuted,
                          }}
                          onMouseEnter={e => {
                            if (!active) {
                              e.currentTarget.style.color = sidebarTextColor;
                              e.currentTarget.style.backgroundColor = "rgba(255,248,240,0.05)";
                            }
                          }}
                          onMouseLeave={e => {
                            if (!active) {
                              e.currentTarget.style.color = sidebarTextMuted;
                              e.currentTarget.style.removeProperty("background-color");
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
          {/* Theme — for all users */}
          <div className="px-1 py-1">
            <ThemeSwitcherInline />
          </div>

          {/* Social Accounts — for regular users to connect their platforms */}
          {!profile?.is_admin && (
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{ color: sidebarTextMuted }}
              onMouseEnter={e => { e.currentTarget.style.color = sidebarTextColor; e.currentTarget.style.backgroundColor = "rgba(255,248,240,0.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = sidebarTextMuted; e.currentTarget.style.removeProperty("background-color"); }}
            >
              <Users className="w-4 h-4" />
              Social Accounts
            </Link>
          )}

          {/* Admin-only links */}
          {profile?.is_admin && (
            <>
              <Link
                href="/dashboard/admin"
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all mb-1"
                style={pathname === "/dashboard/admin" ? {
                  backgroundColor: "rgba(245,158,11,0.15)",
                  color: "var(--color-primary)",
                  border: "1px solid rgba(245,158,11,0.3)",
                } : { color: sidebarTextMuted }}
                onMouseEnter={e => { e.currentTarget.style.color = sidebarTextColor; e.currentTarget.style.backgroundColor = "rgba(255,248,240,0.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = sidebarTextMuted; e.currentTarget.style.removeProperty("background-color"); }}
              >
                <Shield className="w-4 h-4" />
                Admin
              </Link>
              <Link
                href="/integrations"
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{ color: sidebarTextMuted }}
                onMouseEnter={e => { e.currentTarget.style.color = sidebarTextColor; e.currentTarget.style.backgroundColor = "rgba(255,248,240,0.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = sidebarTextMuted; e.currentTarget.style.removeProperty("background-color"); }}
              >
                <Puzzle className="w-4 h-4" />
                Integrations
              </Link>
            </>
          )}

          {/* Settings — admin only */}
          {profile?.is_admin && (
            <Link
              href="/settings"
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{ color: sidebarTextMuted }}
              onMouseEnter={e => { e.currentTarget.style.color = sidebarTextColor; e.currentTarget.style.backgroundColor = "rgba(255,248,240,0.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = sidebarTextMuted; e.currentTarget.style.removeProperty("background-color"); }}
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          )}

          {/* Plan box */}
          {!profile?.is_admin && (
            <div className="mt-4 mx-1 p-3 rounded-lg"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: PLAN_COLORS[userPlan as PlanId] ?? "var(--color-primary)" }} />
                <p className="text-xs font-bold" style={{ color: "#F5D7A0" }}>{planLabel}</p>
              </div>
              <Link href="/dashboard/billing"
                className="mt-2 block w-full py-1.5 rounded-md text-xs font-medium text-center"
                style={{ color: sidebarTextMuted }}>
                Plan & Billing
              </Link>
              <Link href="/upgrade"
                className="mt-1 block w-full py-1.5 rounded-md text-xs font-bold text-center"
                style={{ backgroundColor: "var(--color-primary)", color: "var(--color-surface-dark)" }}>
                Upgrade
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium w-full transition-all"
            style={{ color: sidebarTextMuted }}
            onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = sidebarTextMuted; e.currentTarget.style.removeProperty("background-color"); }}
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

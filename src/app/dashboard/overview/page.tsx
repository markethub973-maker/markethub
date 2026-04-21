"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, CalendarDays, TrendingUp, Sparkles,
  ArrowRight, Activity, Clock,
} from "lucide-react";
import Header from "@/components/layout/Header";
import NextStepBanner from "@/components/ui/NextStepBanner";
import { createClient } from "@/lib/supabase/client";

interface KPIData {
  totalFollowers: number;
  postsThisMonth: number;
  engagementRate: number;
  aiCreditsUsed: number;
}

interface AuditEntry {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
}

interface SuggestedAction {
  label: string;
  description: string;
  href: string;
  done: boolean;
}

export default function OverviewPage() {
  const [kpi, setKpi] = useState<KPIData>({
    totalFollowers: 0,
    postsThisMonth: 0,
    engagementRate: 0,
    aiCreditsUsed: 0,
  });
  const [recentActivity, setRecentActivity] = useState<AuditEntry[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Fetch KPIs in parallel
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [profilesRes, postsRes, creditsRes, activityRes, socialRes] = await Promise.all([
        // Total followers from social profiles
        supabase
          .from("social_profiles")
          .select("followers_count, engagement_rate")
          .eq("user_id", user.id),
        // Posts this month
        supabase
          .from("scheduled_posts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", monthStart),
        // AI credits used
        supabase
          .from("ai_credits")
          .select("credits_used")
          .eq("user_id", user.id)
          .single(),
        // Recent audit logs
        supabase
          .from("audit_logs")
          .select("id, action, details, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
        // Check if social accounts connected
        supabase
          .from("social_accounts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      // Calculate KPIs
      const profiles = profilesRes.data || [];
      const totalFollowers = profiles.reduce((sum, p) => sum + (p.followers_count || 0), 0);
      const avgEngagement = profiles.length > 0
        ? profiles.reduce((sum, p) => sum + (p.engagement_rate || 0), 0) / profiles.length
        : 0;

      setKpi({
        totalFollowers,
        postsThisMonth: postsRes.count || 0,
        engagementRate: Math.round(avgEngagement * 100) / 100,
        aiCreditsUsed: creditsRes.data?.credits_used || 0,
      });

      setRecentActivity(activityRes.data || []);

      // Build suggestions based on what user hasn't done
      const actionList: SuggestedAction[] = [
        {
          label: "Connect social accounts",
          description: "Link your Instagram, TikTok, LinkedIn, or YouTube",
          href: "/social-accounts",
          done: (socialRes.count || 0) > 0,
        },
        {
          label: "Set up Brand Voice",
          description: "Define your brand tone for consistent content",
          href: "/brand/voice",
          done: false, // Would need brand_voice table check
        },
        {
          label: "Create your first post",
          description: "Use AI Studio to generate engaging content",
          href: "/studio/image",
          done: (postsRes.count || 0) > 0,
        },
        {
          label: "Schedule content",
          description: "Plan your posts on the calendar",
          href: "/calendar",
          done: false,
        },
      ];
      setSuggestions(actionList);

      // Try to get active project name
      const { data: projectData } = await supabase
        .from("projects")
        .select("name")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();
      if (projectData) setProjectName(projectData.name);

      setLoading(false);
    }
    load();
  }, []);

  function formatNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return n.toString();
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  const kpiCards = [
    {
      label: "Total Followers",
      value: formatNumber(kpi.totalFollowers),
      icon: Users,
      color: "#10B981",
    },
    {
      label: "Posts This Month",
      value: kpi.postsThisMonth.toString(),
      icon: CalendarDays,
      color: "#818CF8",
    },
    {
      label: "Engagement Rate",
      value: kpi.engagementRate.toFixed(1) + "%",
      icon: TrendingUp,
      color: "#F59E0B",
    },
    {
      label: "AI Credits Used",
      value: formatNumber(kpi.aiCreditsUsed),
      icon: Sparkles,
      color: "#EC8054",
    },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg, #FFFCF7)" }}>
      <Header title="Overview" subtitle="Your marketing dashboard at a glance" />

      <main className="px-4 md:px-6 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">
        {/* NextStepBanner */}
        <NextStepBanner currentPage="/dashboard/overview" />

        {/* ROW 1: Project status bar */}
        <div
          className="rounded-xl px-4 py-3 md:px-6 md:py-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4"
          style={{
            backgroundColor: "var(--color-surface, #FFFFFF)",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: projectName ? "#10B981" : "#9CA3AF" }}
            />
            <span
              className="text-sm font-medium truncate"
              style={{ color: "var(--color-text, #2D2620)" }}
            >
              {projectName ? `Active project: ${projectName}` : "No active project"}
            </span>
          </div>
          {!projectName && (
            <Link
              href="/dashboard/projects"
              className="text-xs font-semibold flex items-center gap-1 shrink-0"
              style={{ color: "var(--color-primary, #F59E0B)" }}
            >
              Create Project <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {/* ROW 2: KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl p-4 md:p-5 transition-all"
              style={{
                backgroundColor: "var(--color-surface, #FFFFFF)",
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${card.color}15` }}
                >
                  <card.icon className="w-4 h-4" style={{ color: card.color }} />
                </div>
                <span
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: "var(--color-text, #2D2620)", opacity: 0.5 }}
                >
                  {card.label}
                </span>
              </div>
              <p
                className="text-2xl md:text-3xl font-bold"
                style={{ color: "var(--color-text, #2D2620)" }}
              >
                {loading ? "--" : card.value}
              </p>
            </div>
          ))}
        </div>

        {/* ROW 3: Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Left: Platform Performance placeholder */}
          <div
            className="rounded-xl p-4 md:p-6"
            style={{
              backgroundColor: "var(--color-surface, #FFFFFF)",
              border: "1px solid rgba(0,0,0,0.06)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <h3
              className="text-sm font-bold uppercase tracking-wider mb-4"
              style={{ color: "var(--color-text, #2D2620)", opacity: 0.6 }}
            >
              Platform Performance
            </h3>
            <div
              className="h-48 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.02)" }}
            >
              <div className="text-center">
                <Activity
                  className="w-8 h-8 mx-auto mb-2"
                  style={{ color: "var(--color-primary, #F59E0B)", opacity: 0.4 }}
                />
                <p className="text-xs" style={{ color: "var(--color-text, #2D2620)", opacity: 0.4 }}>
                  Connect accounts to see performance data
                </p>
              </div>
            </div>
          </div>

          {/* Right: What to Do Next */}
          <div
            className="rounded-xl p-4 md:p-6"
            style={{
              backgroundColor: "var(--color-surface, #FFFFFF)",
              border: "1px solid rgba(0,0,0,0.06)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <h3
              className="text-sm font-bold uppercase tracking-wider mb-4"
              style={{ color: "var(--color-text, #2D2620)", opacity: 0.6 }}
            >
              What to Do Next
            </h3>
            <div className="space-y-3">
              {suggestions.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="flex items-center gap-3 p-3 rounded-lg transition-all hover:opacity-80"
                  style={{
                    backgroundColor: s.done ? "rgba(16,185,129,0.06)" : "rgba(245,158,11,0.06)",
                    border: `1px solid ${s.done ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)"}`,
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{
                      backgroundColor: s.done ? "#10B981" : "rgba(245,158,11,0.2)",
                      color: s.done ? "#fff" : "var(--color-primary, #F59E0B)",
                    }}
                  >
                    {s.done ? "\u2713" : "\u2192"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: "var(--color-text, #2D2620)" }}
                    >
                      {s.label}
                    </p>
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--color-text, #2D2620)", opacity: 0.5 }}
                    >
                      {s.description}
                    </p>
                  </div>
                  <ArrowRight
                    className="w-4 h-4 shrink-0"
                    style={{ color: "var(--color-text, #2D2620)", opacity: 0.3 }}
                  />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ROW 4: Recent Activity */}
        <div
          className="rounded-xl p-4 md:p-6"
          style={{
            backgroundColor: "var(--color-surface, #FFFFFF)",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <h3
            className="text-sm font-bold uppercase tracking-wider mb-4"
            style={{ color: "var(--color-text, #2D2620)", opacity: 0.6 }}
          >
            Recent Activity
          </h3>
          {loading ? (
            <p className="text-sm" style={{ color: "var(--color-text, #2D2620)", opacity: 0.4 }}>
              Loading...
            </p>
          ) : recentActivity.length === 0 ? (
            <div className="py-8 text-center">
              <Clock
                className="w-8 h-8 mx-auto mb-2"
                style={{ color: "var(--color-text, #2D2620)", opacity: 0.2 }}
              />
              <p className="text-sm" style={{ color: "var(--color-text, #2D2620)", opacity: 0.4 }}>
                No activity yet. Start using the platform to see your history here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{ backgroundColor: "rgba(0,0,0,0.015)" }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: "var(--color-primary, #F59E0B)" }}
                  />
                  <span
                    className="text-sm flex-1 truncate"
                    style={{ color: "var(--color-text, #2D2620)" }}
                  >
                    {entry.action}
                    {entry.details && (
                      <span style={{ opacity: 0.5 }}> - {entry.details}</span>
                    )}
                  </span>
                  <span
                    className="text-xs shrink-0"
                    style={{ color: "var(--color-text, #2D2620)", opacity: 0.4 }}
                  >
                    {timeAgo(entry.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

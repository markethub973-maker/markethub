"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}
function currency(n: number, c = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 2 }).format(n);
}
function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "< 1h ago";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = "#F59E0B" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white border border-[#E8D9C5] rounded-xl p-4">
      <p className="text-xs text-[#78614E] mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-[#C4AA8A] mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Bar ──────────────────────────────────────────────────────────────────────
function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-2 bg-[#F5E8D4] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
    </div>
  );
}

// ── STORIES TAB ──────────────────────────────────────────────────────────────
function StoriesTab() {
  const [data, setData] = useState<{
    stories: Array<{
      id: string; timestamp: string; media_type: string; media_url?: string;
      impressions: number; reach: number; exits: number; exit_rate: number;
      replies: number; reply_rate: number; taps_forward: number; taps_back: number;
    }>;
    summary: { total: number; total_reach: number; avg_exit_rate: number; avg_reply_rate: number; total_replies: number } | null;
    error?: string; message?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/instagram/stories")
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (data?.error) return <ErrorBox msg={data.error} />;
  if (!data?.stories?.length) return (
    <EmptyBox icon="📖" title="No active stories" sub={data?.message || "You have no stories active right now. Stories disappear after 24 hours."} />
  );

  const { stories, summary } = data;
  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Active Stories" value={String(summary.total)} />
          <StatCard label="Total Reach" value={fmt(summary.total_reach)} />
          <StatCard label="Avg Exit Rate" value={`${summary.avg_exit_rate}%`} color="#DC2626" />
          <StatCard label="Avg Reply Rate" value={`${summary.avg_reply_rate}%`} color="#16A34A" />
          <StatCard label="Total Replies" value={fmt(summary.total_replies)} color="#8B5CF6" />
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {stories.map(s => (
          <div key={s.id} className="bg-white border border-[#E8D9C5] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs bg-[#F5E8D4] text-[#78614E] px-2 py-0.5 rounded-full">{s.media_type}</span>
              <span className="text-xs text-[#C4AA8A]">{timeAgo(s.timestamp)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center">
                <p className="text-lg font-bold text-[#292524]">{fmt(s.impressions)}</p>
                <p className="text-xs text-[#78614E]">Impressions</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-[#292524]">{fmt(s.reach)}</p>
                <p className="text-xs text-[#78614E]">Unique Reach</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-[#292524]">{s.replies}</p>
                <p className="text-xs text-[#78614E]">Replies</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#78614E]">Exit Rate</span>
                  <span className={s.exit_rate > 50 ? "text-red-500 font-bold" : "text-[#292524] font-bold"}>{s.exit_rate}%</span>
                </div>
                <Bar pct={s.exit_rate} color={s.exit_rate > 50 ? "#DC2626" : "#F59E0B"} />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#78614E]">Reply Rate</span>
                  <span className="text-[#292524] font-bold">{s.reply_rate}%</span>
                </div>
                <Bar pct={s.reply_rate * 10} color="#16A34A" />
              </div>
            </div>
            <div className="flex gap-3 mt-2 pt-2 border-t border-[#F5E8D4]">
              <span className="text-xs text-[#78614E]">⏩ Fwd: {s.taps_forward}</span>
              <span className="text-xs text-[#78614E]">⏪ Back: {s.taps_back}</span>
              <span className="text-xs text-[#78614E]">🚪 Exits: {s.exits}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── REELS TAB ────────────────────────────────────────────────────────────────
function ReelsTab() {
  const [data, setData] = useState<{
    reels: Array<{
      id: string; timestamp: string; caption: string; thumbnail?: string;
      permalink: string; plays: number; reach: number; shares: number;
      saves: number; comments: number; likes: number; total_interactions: number; engagement_rate: number;
    }>;
    avg_plays: number; avg_reach: number; total: number;
    error?: string; message?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/instagram/reels-insights")
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (data?.error) return <ErrorBox msg={data.error} />;
  if (!data?.reels?.length) return <EmptyBox icon="🎬" title="No Reels found" sub={data?.message || "No Reels found on your account."} />;

  const { reels, avg_plays, avg_reach } = data;
  const totalShares = reels.reduce((s, r) => s + r.shares, 0);
  const bestReel = reels.reduce((a, b) => a.plays > b.plays ? a : b, reels[0]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Reels" value={String(reels.length)} />
        <StatCard label="Avg Plays" value={fmt(avg_plays)} color="#8B5CF6" />
        <StatCard label="Avg Reach" value={fmt(avg_reach)} color="#3B82F6" />
        <StatCard label="Total Shares" value={fmt(totalShares)} color="#16A34A" />
      </div>

      {bestReel && (
        <div className="bg-gradient-to-r from-[#292524] to-[#3D2E1E] rounded-xl p-4 flex items-start gap-4">
          <div className="text-3xl">🏆</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#C4AA8A] mb-1">Best Performing Reel</p>
            <p className="text-white font-semibold text-sm truncate">{bestReel.caption || "No caption"}</p>
            <div className="flex gap-4 mt-2">
              <span className="text-[#F59E0B] text-sm font-bold">{fmt(bestReel.plays)} plays</span>
              <span className="text-[#C4AA8A] text-sm">{fmt(bestReel.reach)} reach</span>
              <span className="text-[#C4AA8A] text-sm">{bestReel.engagement_rate}% eng.</span>
            </div>
          </div>
          {bestReel.permalink && (
            <a href={bestReel.permalink} target="_blank" rel="noopener noreferrer"
              className="text-xs text-[#F59E0B] hover:underline shrink-0">View ↗</a>
          )}
        </div>
      )}

      <div className="space-y-2">
        {reels.map((r, i) => (
          <div key={r.id} className="bg-white border border-[#E8D9C5] rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-xs font-bold text-[#C4AA8A] w-5 shrink-0 mt-0.5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#292524] truncate mb-2">{r.caption || "No caption"}</p>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {[
                    { label: "Plays", val: fmt(r.plays), color: "#8B5CF6" },
                    { label: "Reach", val: fmt(r.reach), color: "#3B82F6" },
                    { label: "Shares", val: fmt(r.shares), color: "#16A34A" },
                    { label: "Saves", val: fmt(r.saves), color: "#F59E0B" },
                    { label: "Likes", val: fmt(r.likes), color: "#EC4899" },
                    { label: "Eng %", val: `${r.engagement_rate}%`, color: "#292524" },
                  ].map(m => (
                    <div key={m.label} className="text-center">
                      <p className="text-sm font-bold" style={{ color: m.color }}>{m.val}</p>
                      <p className="text-xs text-[#C4AA8A]">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="shrink-0 text-xs text-[#C4AA8A]">{timeAgo(r.timestamp)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ADS TAB ──────────────────────────────────────────────────────────────────
function AdsTab() {
  const [preset, setPreset] = useState("last_30d");
  const [data, setData] = useState<{
    accounts: Array<{
      account_id: string; account_name: string; currency: string; status: number;
      impressions: number; clicks: number; spend: number;
      cpm: number; cpc: number; ctr: number; reach: number; frequency: number;
      conversions: number; roas: number;
    }>;
    totals: {
      total_spend: number; total_impressions: number; total_clicks: number;
      avg_cpm: number; avg_cpc: number; avg_ctr: number; total_conversions: number; avg_roas: number;
    };
    error?: string; needs_permission?: boolean; message?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback((p: string) => {
    setLoading(true);
    fetch(`/api/facebook/ads?preset=${p}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(preset); }, [preset, load]);

  const PRESETS = [
    { value: "last_7d", label: "7 days" },
    { value: "last_30d", label: "30 days" },
    { value: "last_90d", label: "90 days" },
    { value: "this_month", label: "This month" },
  ];

  if (loading) return <Loader />;

  if (data?.needs_permission || (data?.error && data.error.includes("permission"))) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <p className="text-3xl mb-3">🔑</p>
        <p className="font-semibold text-amber-800 mb-1">ads_read permission required</p>
        <p className="text-sm text-amber-700">Reconnect your Instagram/Facebook account and grant <strong>ads_read</strong> permission to access Ad Account insights.</p>
      </div>
    );
  }
  if (data?.error) return <ErrorBox msg={data.error} />;
  if (!data?.accounts?.length) return (
    <EmptyBox icon="📢" title="No ad accounts found" sub={data?.message || "No active ad accounts linked to your Meta account."} />
  );

  const { accounts, totals } = data;
  const curr = accounts[0]?.currency || "USD";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {PRESETS.map(p => (
          <button key={p.value} onClick={() => setPreset(p.value)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${preset === p.value ? "bg-[#F59E0B] text-white border-[#F59E0B]" : "bg-white text-[#78614E] border-[#E8D9C5] hover:border-[#F59E0B]"}`}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Spend" value={currency(totals.total_spend, curr)} color="#DC2626" />
        <StatCard label="Avg CPM" value={currency(totals.avg_cpm, curr)} sub="Cost per 1000 impressions" />
        <StatCard label="Avg CPC" value={currency(totals.avg_cpc, curr)} sub="Cost per click" />
        <StatCard label="Avg CTR" value={`${totals.avg_ctr}%`} color="#16A34A" sub="Click-through rate" />
        <StatCard label="Impressions" value={fmt(totals.total_impressions)} color="#8B5CF6" />
        <StatCard label="Clicks" value={fmt(totals.total_clicks)} color="#3B82F6" />
        <StatCard label="Conversions" value={fmt(totals.total_conversions)} color="#16A34A" />
        <StatCard label="Avg ROAS" value={`${totals.avg_roas}x`} color={totals.avg_roas >= 2 ? "#16A34A" : totals.avg_roas >= 1 ? "#F59E0B" : "#DC2626"} sub="Return on ad spend" />
      </div>

      <div className="space-y-3">
        {accounts.map(a => (
          <div key={a.account_id} className="bg-white border border-[#E8D9C5] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-[#292524] text-sm">{a.account_name}</p>
                <p className="text-xs text-[#C4AA8A]">{a.account_id} · {a.currency}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${a.status === 1 ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                {a.status === 1 ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2 text-center">
              {[
                { label: "Spend", val: currency(a.spend, a.currency), color: "#DC2626" },
                { label: "Impressions", val: fmt(a.impressions), color: "#8B5CF6" },
                { label: "Clicks", val: fmt(a.clicks), color: "#3B82F6" },
                { label: "Reach", val: fmt(a.reach), color: "#F59E0B" },
                { label: "CPM", val: currency(a.cpm, a.currency), color: "#292524" },
                { label: "CPC", val: currency(a.cpc, a.currency), color: "#292524" },
                { label: "CTR", val: `${a.ctr}%`, color: a.ctr >= 1 ? "#16A34A" : "#DC2626" },
                { label: "ROAS", val: `${a.roas}x`, color: a.roas >= 2 ? "#16A34A" : a.roas >= 1 ? "#F59E0B" : "#DC2626" },
              ].map(m => (
                <div key={m.label}>
                  <p className="text-xs font-bold" style={{ color: m.color }}>{m.val}</p>
                  <p className="text-xs text-[#C4AA8A]">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CROSS-PLATFORM TAB ───────────────────────────────────────────────────────
function CrossPlatformTab() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<{
    instagram: Array<{ id: string; date: string; caption: string; type: string; likes: number; comments: number; reach: number; engagement_rate: number; permalink?: string }>;
    facebook: Array<{ id: string; date: string; caption: string; type: string; likes: number; comments: number; engagement_rate: number; permalink?: string }>;
    summary: {
      days: number; ig_posts: number; fb_posts: number;
      ig_avg_engagement: number; ig_avg_likes: number; ig_avg_comments: number;
      fb_avg_likes: number; fb_avg_comments: number; winner: string | null;
    };
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback((d: number) => {
    setLoading(true);
    fetch(`/api/meta/cross-platform?days=${d}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(days); }, [days, load]);

  if (loading) return <Loader />;
  if (data?.error) return <ErrorBox msg={data.error} />;

  const s = data?.summary;
  const igPosts = data?.instagram || [];
  const fbPosts = data?.facebook || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {[7, 14, 30, 60].map(d => (
          <button key={d} onClick={() => setDays(d)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${days === d ? "bg-[#F59E0B] text-white border-[#F59E0B]" : "bg-white text-[#78614E] border-[#E8D9C5] hover:border-[#F59E0B]"}`}>
            {d} days
          </button>
        ))}
      </div>

      {s && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="IG Posts" value={String(s.ig_posts)} color="#E1306C" />
            <StatCard label="FB Posts" value={String(s.fb_posts)} color="#1877F2" />
            <StatCard label="IG Avg Eng." value={`${s.ig_avg_engagement}%`} color="#E1306C" />
            <StatCard label="Best Platform" value={s.winner === "instagram" ? "Instagram" : s.winner === "facebook" ? "Facebook" : "—"}
              color={s.winner === "instagram" ? "#E1306C" : "#1877F2"} />
          </div>

          <div className="bg-white border border-[#E8D9C5] rounded-xl p-4">
            <h3 className="font-semibold text-[#292524] text-sm mb-4">Platform Comparison</h3>
            <div className="grid grid-cols-2 gap-6">
              {[
                { platform: "Instagram", color: "#E1306C", avg_likes: s.ig_avg_likes, avg_comments: s.ig_avg_comments, posts: s.ig_posts },
                { platform: "Facebook", color: "#1877F2", avg_likes: s.fb_avg_likes, avg_comments: s.fb_avg_comments, posts: s.fb_posts },
              ].map(p => (
                <div key={p.platform} className="text-center p-4 rounded-xl" style={{ backgroundColor: `${p.color}10` }}>
                  <p className="font-bold text-sm mb-3" style={{ color: p.color }}>{p.platform}</p>
                  <p className="text-2xl font-bold text-[#292524]">{fmt(p.avg_likes)}</p>
                  <p className="text-xs text-[#78614E] mb-2">Avg Likes / Post</p>
                  <p className="text-lg font-bold text-[#292524]">{fmt(p.avg_comments)}</p>
                  <p className="text-xs text-[#78614E] mb-2">Avg Comments / Post</p>
                  <p className="text-xs text-[#C4AA8A]">{p.posts} posts analyzed</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Instagram posts */}
        <div>
          <h3 className="font-semibold text-[#292524] text-sm mb-2 flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#E1306C] inline-block" /> Instagram Posts
          </h3>
          <div className="space-y-2">
            {igPosts.slice(0, 8).map(p => (
              <div key={p.id} className="bg-white border border-[#E8D9C5] rounded-lg p-3">
                <p className="text-xs text-[#292524] truncate mb-1.5">{p.caption || "No caption"}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#E1306C] font-bold">❤ {fmt(p.likes)}</span>
                  <span className="text-xs text-[#78614E]">💬 {fmt(p.comments)}</span>
                  {p.reach > 0 && <span className="text-xs text-[#78614E]">👁 {fmt(p.reach)}</span>}
                  <span className="ml-auto text-xs text-[#C4AA8A]">{p.engagement_rate}%</span>
                </div>
              </div>
            ))}
            {igPosts.length === 0 && <p className="text-xs text-[#C4AA8A] p-3">No Instagram posts found</p>}
          </div>
        </div>

        {/* Facebook posts */}
        <div>
          <h3 className="font-semibold text-[#292524] text-sm mb-2 flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#1877F2] inline-block" /> Facebook Posts
          </h3>
          <div className="space-y-2">
            {fbPosts.slice(0, 8).map(p => (
              <div key={p.id} className="bg-white border border-[#E8D9C5] rounded-lg p-3">
                <p className="text-xs text-[#292524] truncate mb-1.5">{p.caption || "No text"}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#1877F2] font-bold">👍 {fmt(p.likes)}</span>
                  <span className="text-xs text-[#78614E]">💬 {fmt(p.comments)}</span>
                  <span className="ml-auto text-xs text-[#C4AA8A]">{timeAgo(p.date)}</span>
                </div>
              </div>
            ))}
            {fbPosts.length === 0 && <p className="text-xs text-[#C4AA8A] p-3">No Facebook posts found</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AUDIENCE OVERLAP TAB ─────────────────────────────────────────────────────
function AudienceOverlapTab() {
  const [data, setData] = useState<{
    gender_overlap: Array<{ gender: string; ig_pct: number; fb_pct: number; overlap_pct: number }>;
    country_overlap: Array<{ country: string; ig_pct: number; fb_pct: number; overlap_pct: number }>;
    fb_fan_count: number; fb_follower_count: number;
    overall_overlap_pct: number;
    has_ig_data: boolean; has_fb_data: boolean;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/meta/audience-overlap")
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (data?.error) return <ErrorBox msg={data.error} />;
  if (!data?.has_ig_data && !data?.has_fb_data) {
    return <EmptyBox icon="👥" title="Audience data not available" sub="Make sure your Instagram Business account and Facebook Page are connected with the correct permissions." />;
  }

  const { gender_overlap, country_overlap, fb_fan_count, overall_overlap_pct } = data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="FB Page Fans" value={fmt(fb_fan_count)} color="#1877F2" />
        <StatCard label="Audience Overlap" value={`${overall_overlap_pct}%`}
          color={overall_overlap_pct > 60 ? "#16A34A" : overall_overlap_pct > 30 ? "#F59E0B" : "#DC2626"}
          sub="Gender similarity score" />
        <div className="bg-white border border-[#E8D9C5] rounded-xl p-4 flex items-center gap-3">
          <div className="text-2xl">{overall_overlap_pct > 60 ? "✅" : overall_overlap_pct > 30 ? "⚠️" : "❌"}</div>
          <div>
            <p className="text-xs text-[#78614E]">Budget Efficiency</p>
            <p className="text-sm font-semibold text-[#292524]">
              {overall_overlap_pct > 60 ? "High overlap — avoid duplicate ads" : overall_overlap_pct > 30 ? "Moderate overlap — optimize targeting" : "Low overlap — audiences differ"}
            </p>
          </div>
        </div>
      </div>

      {/* Gender comparison */}
      <div className="bg-white border border-[#E8D9C5] rounded-xl p-4">
        <h3 className="font-semibold text-[#292524] text-sm mb-4">Gender Audience Comparison</h3>
        <div className="space-y-3">
          {gender_overlap.map(g => (
            <div key={g.gender}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-[#292524]">{g.gender}</span>
                <span className="text-[#C4AA8A]">Overlap: {g.overlap_pct}%</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#E1306C] w-20 shrink-0">Instagram</span>
                  <div className="flex-1">
                    <Bar pct={g.ig_pct} color="#E1306C" />
                  </div>
                  <span className="text-xs font-bold text-[#292524] w-10 text-right">{g.ig_pct}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#1877F2] w-20 shrink-0">Facebook</span>
                  <div className="flex-1">
                    <Bar pct={g.fb_pct} color="#1877F2" />
                  </div>
                  <span className="text-xs font-bold text-[#292524] w-10 text-right">{g.fb_pct}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Country overlap */}
      {country_overlap.length > 0 && (
        <div className="bg-white border border-[#E8D9C5] rounded-xl p-4">
          <h3 className="font-semibold text-[#292524] text-sm mb-1">Top Country Overlap</h3>
          <p className="text-xs text-[#C4AA8A] mb-4">Countries where both IG and FB audiences concentrate</p>
          <div className="space-y-3">
            {country_overlap.map(c => (
              <div key={c.country}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-[#292524]">🌍 {c.country}</span>
                  <span className="text-[#C4AA8A]">Overlap: {c.overlap_pct}%</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#E1306C] w-20 shrink-0">Instagram</span>
                    <div className="flex-1"><Bar pct={c.ig_pct * 5} color="#E1306C" /></div>
                    <span className="text-xs text-[#292524] w-10 text-right">{c.ig_pct}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#1877F2] w-20 shrink-0">Facebook</span>
                    <div className="flex-1"><Bar pct={c.fb_pct * 5} color="#1877F2" /></div>
                    <span className="text-xs text-[#292524] w-10 text-right">{c.fb_pct}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#FFFBEB] border border-amber-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-amber-800 mb-1">💡 How to use this data</p>
        <ul className="text-xs text-amber-700 space-y-1">
          <li>• High overlap = risk of paying twice to reach the same person → use Meta&apos;s &quot;Advantage+ Audience&quot; exclusions</li>
          <li>• Low overlap = audiences are distinct → you can run parallel campaigns without cannibalization</li>
          <li>• Same top countries = concentrate budget in those markets across both platforms</li>
        </ul>
      </div>
    </div>
  );
}

// ── Shared UI ────────────────────────────────────────────────────────────────
function Loader() {
  return (
    <div className="flex items-center justify-center py-16">
      <svg className="w-8 h-8 animate-spin text-[#F59E0B]" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
    </div>
  );
}
function ErrorBox({ msg }: { msg: string }) {
  return <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">{msg}</div>;
}
function EmptyBox({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-4xl mb-3">{icon}</p>
      <p className="font-semibold text-[#292524] mb-1">{title}</p>
      <p className="text-sm text-[#78614E] max-w-sm mx-auto">{sub}</p>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { id: "stories", label: "Stories Analytics", icon: "📖" },
  { id: "reels", label: "Reels Insights", icon: "🎬" },
  { id: "ads", label: "Ad Account", icon: "📢" },
  { id: "cross", label: "Cross-Platform", icon: "⚖️" },
  { id: "overlap", label: "Audience Overlap", icon: "👥" },
];

export default function MetaInsightsPage() {
  const [tab, setTab] = useState("stories");

  return (
    <div>
      <Header title="Meta Insights" subtitle="Instagram & Facebook advanced analytics" />
      <div className="p-6 max-w-6xl mx-auto space-y-4">

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 bg-white border border-[#E8D9C5] rounded-xl p-2">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-[#F59E0B] text-white" : "text-[#78614E] hover:bg-[#F5E8D4]"}`}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "stories" && <StoriesTab />}
        {tab === "reels" && <ReelsTab />}
        {tab === "ads" && <AdsTab />}
        {tab === "cross" && <CrossPlatformTab />}
        {tab === "overlap" && <AudienceOverlapTab />}
      </div>
    </div>
  );
}

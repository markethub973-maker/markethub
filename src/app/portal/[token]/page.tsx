"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface ApprovalSlice {
  id: string;
  caption: string | null;
  platform: string | null;
  date: string | null;
  time: string | null;
  image_url: string | null;
  approval_status: "pending" | "approved" | "rejected" | null;
  approval_token: string | null;
  revision_count: number;
  comments_count: number;
  recent_comments: { id: string; author: string; comment: string; at: string }[];
}

interface ApprovalsResponse {
  client_name: string;
  counts: { pending: number; approved: number; rejected: number; total: number };
  approvals: ApprovalSlice[];
}

interface PortalData {
  client_name: string;
  ig_username: string;
  tt_username: string;
  updated_at: string;
  agency_name?: string | null;
  agency_logo_url?: string | null;
  accent_color?: string | null;
  data: {
    // Instagram
    ig_followers?: number;
    ig_following?: number;
    ig_posts?: number;
    ig_engagement?: number;
    ig_bio?: string;
    ig_avatar?: string;
    ig_verified?: boolean;
    // TikTok
    tt_followers?: number;
    tt_likes?: number;
    tt_videos?: number;
    tt_avatar?: string;
    // Recent posts
    posts?: Array<{
      s: string; l: number; c: number; v: number; vv: number; t: number; th: string;
    }>;
    // Notes
    notes?: string;
  };
}

function fmt(n: number): string {
  if (!n) return "0";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 86400000 / 24)}d ago`;
}

function StatBox({ label, value, color = "var(--color-primary)" }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl p-4 text-center" style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.3)" }}>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>{label}</p>
    </div>
  );
}

export default function ClientPortalPage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const [portal, setPortal] = useState<PortalData | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "expired" | "ok" | "password">("loading");
  const [errMsg, setErrMsg] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [wrongPassword, setWrongPassword] = useState(false);
  const [approvals, setApprovals] = useState<ApprovalsResponse | null>(null);

  // Fetch approvals whenever the portal loads successfully
  useEffect(() => {
    if (status !== "ok" || !token) return;
    void (async () => {
      try {
        const r = await fetch(`/api/client-portal/${token}/approvals`, { cache: "no-store" });
        if (r.ok) setApprovals((await r.json()) as ApprovalsResponse);
      } catch {
        /* silent — section just stays hidden */
      }
    })();
  }, [status, token]);

  const fetchPortal = async (password?: string) => {
    if (!token) return;
    try {
      const headers: Record<string, string> = {};
      if (password) headers["x-portal-password"] = password;
      const r = await fetch(`/api/client-portal/${token}`, { headers });
      const json = await r.json();
      if (r.status === 410) { setStatus("expired"); return; }
      if (r.status === 401 && json.requires_password) {
        if (json.wrong_password) setWrongPassword(true);
        setStatus("password");
        return;
      }
      if (!r.ok) { setErrMsg(json.error || "Unknown error"); setStatus("error"); return; }
      setPortal(json.link as PortalData);
      setStatus("ok");
    } catch {
      setErrMsg("Network error");
      setStatus("error");
    }
  };

  useEffect(() => {
    fetchPortal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;
    setPasswordSubmitting(true);
    setWrongPassword(false);
    await fetchPortal(passwordInput.trim());
    setPasswordSubmitting(false);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FAF7F2" }}>
        <svg className="w-8 h-8 animate-spin" style={{ color: "var(--color-primary)" }} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  if (status === "password") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#FAF7F2" }}>
        <form onSubmit={submitPassword}
          className="w-full max-w-sm rounded-2xl p-8"
          style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.3)", boxShadow: "0 4px 16px rgba(120,97,78,0.12)" }}>
          <div className="text-center mb-6">
            <p className="text-4xl mb-3">🔒</p>
            <h1 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>Protected report</h1>
            <p className="text-xs mt-1" style={{ color: "#A8967E" }}>This report is password-protected. Ask the agency for the password.</p>
          </div>
          <input
            type="password"
            value={passwordInput}
            onChange={e => { setPasswordInput(e.target.value); setWrongPassword(false); }}
            placeholder="Enter password"
            autoFocus
            disabled={passwordSubmitting}
            className="w-full px-4 py-3 text-sm rounded-xl focus:outline-none mb-3"
            style={{
              border: `1px solid ${wrongPassword ? "#DC2626" : "rgba(245,215,160,0.4)"}`,
              backgroundColor: "var(--color-bg)",
              color: "var(--color-text)",
            }}
          />
          {wrongPassword && (
            <p className="text-xs mb-3 font-semibold" style={{ color: "#DC2626" }}>
              Wrong password — please try again.
            </p>
          )}
          <button
            type="submit"
            disabled={passwordSubmitting || !passwordInput.trim()}
            className="w-full px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{ backgroundColor: "var(--color-primary)", color: "white" }}>
            {passwordSubmitting ? "Verifying..." : "Unlock report"}
          </button>
        </form>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FAF7F2" }}>
        <div className="text-center px-6">
          <p className="text-4xl mb-4">⏰</p>
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--color-text)" }}>Link expired</h1>
          <p className="text-sm" style={{ color: "#A8967E" }}>This report link has expired. Ask the agency for a new one.</p>
          <a href="https://markethubpromo.com" className="inline-block mt-6 text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
            markethubpromo.com →
          </a>
        </div>
      </div>
    );
  }

  if (status === "error" || !portal) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FAF7F2" }}>
        <div className="text-center px-6">
          <p className="text-4xl mb-4">🔗</p>
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--color-text)" }}>Link not found</h1>
          <p className="text-sm" style={{ color: "#A8967E" }}>{errMsg || "This link is invalid. Ask the agency for a new one."}</p>
          <a href="https://markethubpromo.com" className="inline-block mt-6 text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
            markethubpromo.com →
          </a>
        </div>
      </div>
    );
  }

  const d = portal.data || {};
  const accent = portal.accent_color || "var(--color-primary)";
  const agencyName = portal.agency_name || "MarketHub Pro";
  const agencyLogo = portal.agency_logo_url || "";
  const engColor = (d.ig_engagement || 0) >= 5 ? "#16A34A" : (d.ig_engagement || 0) >= 3 ? accent : "#DC2626";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAF7F2" }}>
      {/* Top bar */}
      <div style={{ background: "linear-gradient(135deg,#292524,#3D2E1E)", padding: "14px 24px" }}
        className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {agencyLogo ? (
            <img
              src={`/api/image-proxy?url=${encodeURIComponent(agencyLogo)}`}
              alt={agencyName}
              className="w-7 h-7 rounded-lg object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm"
              style={{ backgroundColor: accent, color: "#1C1814" }}>{agencyName.charAt(0).toUpperCase()}</div>
          )}
          <span className="font-semibold text-sm" style={{ color: "#F5D7A0" }}>{agencyName}</span>
        </div>
        <span className="text-xs" style={{ color: "#78614E" }}>Live analytics report</span>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Client header */}
        <div className="rounded-2xl p-6 flex items-center gap-4"
          style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.3)", boxShadow: "0 2px 8px rgba(120,97,78,0.08)" }}>
          {d.ig_avatar ? (
            <img
              src={`/api/image-proxy?url=${encodeURIComponent(d.ig_avatar)}`}
              alt=""
              className="w-16 h-16 rounded-full object-cover shrink-0"
              style={{ border: "2px solid rgba(225,48,108,0.2)" }}
            />
          ) : (
            <div className="w-16 h-16 rounded-full shrink-0 flex items-center justify-center text-2xl"
              style={{ backgroundColor: "rgba(225,48,108,0.08)" }}>👤</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>{portal.client_name}</h1>
              {d.ig_verified && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#3B82F6" }}>✓ Verified</span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-1">
              {portal.ig_username && <span className="text-sm" style={{ color: "#E1306C" }}>📸 @{portal.ig_username}</span>}
              {portal.tt_username && <span className="text-sm" style={{ color: "#FF0050" }}>🎵 @{portal.tt_username}</span>}
            </div>
            {d.ig_bio && <p className="text-xs mt-1.5 line-clamp-2" style={{ color: "#78614E" }}>{d.ig_bio}</p>}
            {d.notes && <p className="text-xs mt-1 italic" style={{ color: "#C4AA8A" }}>{d.notes}</p>}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs" style={{ color: "#C4AA8A" }}>Updated</p>
            <p className="text-xs font-semibold" style={{ color: "#A8967E" }}>{timeAgo(portal.updated_at)}</p>
            <span className="inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ backgroundColor: "rgba(22,163,74,0.1)", color: "#16A34A" }}>
              ● Live
            </span>
          </div>
        </div>

        {/* Instagram stats */}
        {(d.ig_followers || 0) > 0 && (
          <div>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--color-text)" }}>
              <span>📸</span> Instagram Analytics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatBox label="Followers" value={fmt(d.ig_followers || 0)} color="#E1306C" />
              <StatBox label="Following" value={fmt(d.ig_following || 0)} color="#A8967E" />
              <StatBox label="Posts" value={fmt(d.ig_posts || 0)} color="var(--color-text)" />
              <StatBox label="Engagement Rate" value={`${d.ig_engagement || 0}%`} color={engColor} />
            </div>
          </div>
        )}

        {/* TikTok stats */}
        {(d.tt_followers || 0) > 0 && (
          <div>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--color-text)" }}>
              <span>🎵</span> TikTok Analytics
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <StatBox label="Followers" value={fmt(d.tt_followers || 0)} color="#FF0050" />
              <StatBox label="Total Likes" value={fmt(d.tt_likes || 0)} color="#FF0050" />
              <StatBox label="Videos" value={fmt(d.tt_videos || 0)} color="var(--color-text)" />
            </div>
          </div>
        )}

        {/* Recent posts */}
        {(d.posts?.length || 0) > 0 && (
          <div>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--color-text)" }}>
              <span>🖼</span> Recent Posts
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {d.posts!.map((post, i) => (
                <a
                  key={i}
                  href={`https://www.instagram.com/p/${post.s}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl overflow-hidden group"
                  style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.3)" }}>
                  <div className="aspect-square relative overflow-hidden bg-[#F5E8D4]">
                    {post.th ? (
                      <img
                        src={`/api/image-proxy?url=${encodeURIComponent(post.th)}`}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">🖼</div>
                    )}
                    {post.v === 1 && (
                      <span className="absolute top-2 right-2 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">▶</span>
                    )}
                  </div>
                  <div className="p-3 flex justify-between">
                    <span className="text-xs" style={{ color: "#E1306C" }}>❤ {fmt(post.l)}</span>
                    <span className="text-xs" style={{ color: "#78614E" }}>💬 {fmt(post.c)}</span>
                    {post.v === 1 && post.vv > 0 && (
                      <span className="text-xs" style={{ color: "#A8967E" }}>👁 {fmt(post.vv)}</span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Approvals section — Wave 1 */}
        {approvals && approvals.approvals.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--color-text)" }}>
                <span>📝</span> Posts for approval
              </h2>
              <div className="flex gap-2 text-xs">
                {approvals.counts.pending > 0 && (
                  <span className="px-2 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "var(--color-primary)" }}>
                    {approvals.counts.pending} pending
                  </span>
                )}
                {approvals.counts.approved > 0 && (
                  <span className="px-2 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: "rgba(16,185,129,0.12)", color: "#10B981" }}>
                    {approvals.counts.approved} approved
                  </span>
                )}
                {approvals.counts.rejected > 0 && (
                  <span className="px-2 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#EF4444" }}>
                    {approvals.counts.rejected} rejected
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-3">
              {approvals.approvals.map((a) => {
                const statusColor =
                  a.approval_status === "approved"
                    ? "#10B981"
                    : a.approval_status === "rejected"
                      ? "#EF4444"
                      : "var(--color-primary)";
                const statusLabel =
                  a.approval_status === "approved"
                    ? "✓ Approved"
                    : a.approval_status === "rejected"
                      ? "✗ Rejected"
                      : "⏳ Pending";
                return (
                  <a
                    key={a.id}
                    href={a.approval_token ? `/approve/${a.approval_token}` : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-2xl overflow-hidden transition-transform hover:scale-[1.01]"
                    style={{
                      backgroundColor: "var(--color-bg-secondary)",
                      border: "1px solid rgba(245,215,160,0.3)",
                      textDecoration: "none",
                    }}
                  >
                    <div className="flex gap-3 p-4">
                      {a.image_url ? (
                        <img
                          src={`/api/image-proxy?url=${encodeURIComponent(a.image_url)}`}
                          alt=""
                          className="w-20 h-20 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className="w-20 h-20 rounded-lg shrink-0 flex items-center justify-center text-2xl"
                          style={{ backgroundColor: "rgba(245,158,11,0.08)" }}
                        >
                          📄
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ backgroundColor: `${statusColor}18`, color: statusColor }}
                          >
                            {statusLabel}
                          </span>
                          {a.platform && (
                            <span className="text-xs" style={{ color: "#A8967E" }}>
                              {a.platform}
                            </span>
                          )}
                          {a.date && (
                            <span className="text-xs" style={{ color: "#A8967E" }}>
                              ·{" "}
                              {new Date(a.date).toLocaleDateString("ro-RO", {
                                day: "numeric",
                                month: "short",
                              })}
                              {a.time ? ` ${a.time.slice(0, 5)}` : ""}
                            </span>
                          )}
                          {a.comments_count > 0 && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-semibold ml-auto"
                              style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "var(--color-primary)" }}
                            >
                              💬 {a.comments_count}
                            </span>
                          )}
                        </div>
                        <p
                          className="text-sm line-clamp-2"
                          style={{ color: "var(--color-text)" }}
                        >
                          {a.caption || <em style={{ color: "#A8967E" }}>(no caption)</em>}
                        </p>
                        {a.recent_comments.length > 0 && (
                          <div
                            className="mt-2 pt-2 text-xs"
                            style={{ borderTop: "1px solid rgba(245,215,160,0.2)", color: "#78614E" }}
                          >
                            <span className="font-semibold">{a.recent_comments[0].author}:</span>{" "}
                            <span className="italic">
                              {a.recent_comments[0].comment.slice(0, 80)}
                              {a.recent_comments[0].comment.length > 80 ? "…" : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {(d.ig_followers || 0) === 0 && (d.tt_followers || 0) === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📊</p>
            <p className="font-semibold" style={{ color: "var(--color-text)" }}>Analytics coming soon</p>
            <p className="text-sm mt-1" style={{ color: "#78614E" }}>Data will appear here once the agency connects the accounts.</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4 pb-8 space-y-2">
          <div className="h-px" style={{ backgroundColor: "rgba(245,215,160,0.3)" }} />
          <p className="text-xs pt-3" style={{ color: "#C4AA8A" }}>
            Live report by{" "}
            <span className="font-semibold" style={{ color: accent }}>{agencyName}</span>
            {" "}· Updated {timeAgo(portal.updated_at)} · For questions, contact your agency
          </p>
        </div>
      </div>
    </div>
  );
}

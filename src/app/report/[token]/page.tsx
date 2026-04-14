"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";

// ── Token shape (must match clients/page.tsx copyShareLink) ──────────────────
interface ReportData {
  v: number;
  n: string;       // client name
  ig: string;      // IG username
  tt: string;      // TikTok username
  notes: string;
  f: number;       // IG followers
  fw: number;      // IG following
  p: number;       // IG posts count
  e: number;       // engagement rate
  bio: string;
  av: string;      // avatar url
  ver: boolean;    // verified
  tf: number;      // TT followers
  tl: number;      // TT likes
  tv: number;      // TT videos
  posts: Array<{
    s: string;     // shortcode
    l: number;     // likes
    c: number;     // comments
    v: number;     // isVideo (0|1)
    vv: number;    // videoViews
    t: number;     // timestamp
    th: string;    // thumbnail url
  }>;
  ts: number;      // lastUpdated
}

function fmt(n: number): string {
  if (!n) return "0";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(diff / 86400000);
  return `${d}d ago`;
}

function decodeToken(token: string): ReportData | null {
  try {
    const base64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(base64)));
    return JSON.parse(json) as ReportData;
  } catch {
    return null;
  }
}

export default function PublicReportPage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const data = useMemo(() => decodeToken(token), [token]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--color-bg-secondary)" }}>
        <div className="text-center px-6">
          <p className="text-4xl mb-4">🔗</p>
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--color-text)" }}>Invalid or expired link</h1>
          <p className="text-sm" style={{ color: "#A8967E" }}>This report link is invalid. Ask the agency for a new one.</p>
          <a href="https://markethubpromo.com" className="inline-block mt-6 text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
            markethubpromo.com →
          </a>
        </div>
      </div>
    );
  }

  const engColor = data.e >= 5 ? "#16A34A" : data.e >= 3 ? "var(--color-primary)" : "#DC2626";
  const updatedLabel = data.ts ? timeAgo(data.ts) : "—";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAF7F2" }}>
      {/* Top bar */}
      <div style={{ background: "linear-gradient(135deg,#292524,#3D2E1E)", padding: "14px 24px" }}
        className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{ backgroundColor: "var(--color-primary)", color: "#1C1814" }}>M</div>
          <span className="font-semibold text-sm" style={{ color: "#F5D7A0" }}>MarketHub Pro</span>
        </div>
        <span className="text-xs" style={{ color: "#78614E" }}>Read-only analytics report</span>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Client header */}
        <div className="rounded-2xl p-6 flex items-center gap-4"
          style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.3)", boxShadow: "0 2px 8px rgba(120,97,78,0.08)" }}>
          {data.av ? (
            <img
              src={`/api/image-proxy?url=${encodeURIComponent(data.av)}`}
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
              <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>{data.n}</h1>
              {data.ver && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#3B82F6" }}>✓ Verified</span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-1">
              {data.ig && <span className="text-sm" style={{ color: "#E1306C" }}>📸 @{data.ig}</span>}
              {data.tt && <span className="text-sm" style={{ color: "#FF0050" }}>🎵 @{data.tt}</span>}
            </div>
            {data.bio && <p className="text-xs mt-1.5 line-clamp-2" style={{ color: "#78614E" }}>{data.bio}</p>}
            {data.notes && <p className="text-xs mt-1" style={{ color: "#C4AA8A" }}>{data.notes}</p>}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs" style={{ color: "#C4AA8A" }}>Last updated</p>
            <p className="text-xs font-semibold" style={{ color: "#A8967E" }}>{updatedLabel}</p>
          </div>
        </div>

        {/* Instagram stats */}
        {(data.f > 0 || data.p > 0) && (
          <div>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--color-text)" }}>
              <span>📸</span> Instagram Analytics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Followers", value: fmt(data.f), color: "#E1306C" },
                { label: "Following", value: fmt(data.fw), color: "#A8967E" },
                { label: "Posts", value: fmt(data.p), color: "var(--color-text)" },
                { label: "Engagement Rate", value: `${data.e}%`, color: engColor },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-4 text-center"
                  style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.3)" }}>
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TikTok stats */}
        {data.tf > 0 && (
          <div>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--color-text)" }}>
              <span>🎵</span> TikTok Analytics
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Followers", value: fmt(data.tf), color: "#FF0050" },
                { label: "Total Likes", value: fmt(data.tl), color: "#FF0050" },
                { label: "Videos", value: fmt(data.tv), color: "var(--color-text)" },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-4 text-center"
                  style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.3)" }}>
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent posts */}
        {data.posts?.length > 0 && (
          <div>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--color-text)" }}>
              <span>🖼</span> Recent Posts
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {data.posts.map((post, i) => (
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

        {/* Footer */}
        <div className="text-center pt-4 pb-8 space-y-2">
          <div className="h-px" style={{ backgroundColor: "rgba(245,215,160,0.3)" }} />
          <p className="text-xs pt-3" style={{ color: "#C4AA8A" }}>
            This report was generated by{" "}
            <a href="https://markethubpromo.com" target="_blank" rel="noopener noreferrer"
              className="font-semibold" style={{ color: "var(--color-primary)" }}>MarketHub Pro</a>
            {" "}· Data snapshot from {updatedLabel} · For live data, contact your agency
          </p>
        </div>
      </div>
    </div>
  );
}

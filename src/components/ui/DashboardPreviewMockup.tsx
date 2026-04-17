"use client";

/**
 * DashboardPreviewMockup — static, non-interactive mini-preview of the
 * MarketHub Pro dashboard for the /promo hero section.
 */
export default function DashboardPreviewMockup() {
  const navDots = [
    "#f59e0b", "#8B5CF6", "#10B981", "#3B82F6", "#EC4899", "#F97316", "#6366F1",
  ];

  const stats = [
    { value: "12.4K", label: "Followers" },
    { value: "847", label: "Posts" },
    { value: "24.8%", label: "Growth" },
    { value: "19", label: "AI Actions" },
  ];

  const channels = [
    { name: "Instagram — @brand", views: "34.2K", color: "#EC4899" },
    { name: "YouTube — BrandTV", views: "128K", color: "#EF4444" },
    { name: "TikTok — brand.official", views: "91.7K", color: "#10B981" },
  ];

  return (
    <div
      style={{
        display: "flex",
        height: 320,
        width: "100%",
        background: "linear-gradient(135deg, rgba(13,11,30,0.95) 0%, rgba(20,16,40,0.98) 100%)",
        pointerEvents: "none",
        userSelect: "none",
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: 40,
          flexShrink: 0,
          background: "rgba(0,0,0,0.35)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 16,
          gap: 14,
        }}
      >
        {navDots.map((c, i) => (
          <div
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: i === 0 ? c : `${c}55`,
              boxShadow: i === 0 ? `0 0 8px ${c}66` : "none",
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: "16px 20px", overflow: "hidden" }}>
        {/* Stat cards row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: "12px 14px",
                backdropFilter: "blur(12px)",
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.92)",
                  lineHeight: 1.2,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.4)",
                  marginTop: 2,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Middle row: chart + table */}
        <div style={{ display: "flex", gap: 12 }}>
          {/* Area chart */}
          <div
            style={{
              flex: 1.4,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
              padding: "12px 14px",
              height: 180,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.35)",
                marginBottom: 8,
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: "0.05em",
              }}
            >
              Growth Trend
            </div>
            <svg
              viewBox="0 0 300 120"
              style={{ width: "100%", height: "calc(100% - 24px)" }}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              {/* Area fill */}
              <path
                d="M0,100 C30,95 50,80 80,70 C110,60 130,65 160,50 C190,35 210,40 240,25 C260,18 280,10 300,5 L300,120 L0,120 Z"
                fill="url(#areaGrad)"
              />
              {/* Line */}
              <path
                d="M0,100 C30,95 50,80 80,70 C110,60 130,65 160,50 C190,35 210,40 240,25 C260,18 280,10 300,5"
                fill="none"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeLinecap="round"
              />
              {/* Dot at end */}
              <circle cx={300} cy={5} r={3} fill="#f59e0b" />
              <circle cx={300} cy={5} r={6} fill="#f59e0b" opacity={0.25} />
            </svg>
          </div>

          {/* Table */}
          <div
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
              padding: "12px 14px",
              height: 180,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.35)",
                marginBottom: 10,
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: "0.05em",
              }}
            >
              Top Channels
            </div>
            {channels.map((ch, i) => (
              <div
                key={ch.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: ch.color,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    {ch.name}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  {ch.views}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { ImageResponse } from "next/og";

// Per-page OG image for /pricing — shows tier prices prominently
// so LinkedIn / Twitter / Slack previews communicate value instantly.

export const runtime = "edge";
export const alt = "MarketHub Pro — Pricing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TIERS = [
  { name: "Creator", price: "$24", accent: "#8B5CF6" },
  { name: "Pro", price: "$49", accent: "var(--color-primary)", popular: true },
  { name: "Studio", price: "$99", accent: "#10B981" },
  { name: "Agency", price: "$249", accent: "#EF4444" },
];

export default async function OGPricing() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #FFFCF7 0%, #F5EFE5 100%)",
          padding: 72,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            ●
          </div>
          <span style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text)" }}>
            MarketHub Pro
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 56,
            fontWeight: 800,
            lineHeight: 1.1,
            color: "var(--color-text)",
            margin: 0,
            letterSpacing: "-0.02em",
            marginBottom: 16,
          }}
        >
          Plans that scale with you
        </h1>
        <p
          style={{
            fontSize: 22,
            color: "#78614E",
            margin: 0,
            marginBottom: 48,
          }}
        >
          14-day free trial · No credit card required · Cancel anytime
        </p>

        {/* Tier cards */}
        <div
          style={{
            display: "flex",
            gap: 16,
            flex: 1,
            alignItems: "stretch",
          }}
        >
          {TIERS.map((t) => (
            <div
              key={t.name}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                background: "white",
                borderRadius: 20,
                padding: 24,
                border: `2px solid ${t.popular ? t.accent : "rgba(0,0,0,0.06)"}`,
                position: "relative",
              }}
            >
              {t.popular && (
                <div
                  style={{
                    position: "absolute",
                    top: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: t.accent,
                    color: "white",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "4px 12px",
                    borderRadius: 999,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Most popular
                </div>
              )}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: `${t.accent}22`,
                  marginBottom: 12,
                }}
              />
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--color-text)",
                  margin: 0,
                }}
              >
                {t.name}
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 12 }}>
                <span
                  style={{
                    fontSize: 40,
                    fontWeight: 800,
                    color: t.accent,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {t.price}
                </span>
                <span style={{ fontSize: 14, color: "#78614E" }}>/mo</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}

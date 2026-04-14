import { ImageResponse } from "next/og";

// Default Open Graph image used for / and any page that doesn't define
// its own opengraph-image. Generated at build time + cached at the edge,
// so social crawlers (LinkedIn, Twitter, WhatsApp, Slack) get a fast 1200x630
// branded preview without us hosting a static PNG.

export const runtime = "edge";
export const alt = "MarketHub Pro — Social Media Marketing Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #FFFCF7 0%, #F5EFE5 50%, #FFF8F0 100%)",
          position: "relative",
        }}
      >
        {/* decorative orb */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(245,158,11,0.25) 0%, rgba(245,158,11,0) 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -150,
            left: -100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(139,92,246,0) 70%)",
          }}
        />

        {/* content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
            padding: 72,
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* top row — logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
              }}
            >
              ●
            </div>
            <span
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "var(--color-text)",
              }}
            >
              MarketHub Pro
            </span>
          </div>

          {/* middle — headline + sub */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <h1
              style={{
                fontSize: 72,
                fontWeight: 800,
                lineHeight: 1.05,
                color: "var(--color-text)",
                margin: 0,
                letterSpacing: "-0.02em",
                maxWidth: 900,
              }}
            >
              Social Media Marketing,{" "}
              <span style={{ color: "var(--color-primary-hover)" }}>fully automated</span>
            </h1>
            <p
              style={{
                fontSize: 28,
                color: "#78614E",
                margin: 0,
                lineHeight: 1.4,
                maxWidth: 800,
              }}
            >
              Cross-platform analytics · Calendar with auto-publish · CRM ·
              AI agents · 31 ready automations
            </p>
          </div>

          {/* bottom row — feature tags + URL */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", gap: 12 }}>
              {["Instagram", "TikTok", "YouTube", "LinkedIn"].map((t) => (
                <div
                  key={t}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 999,
                    background: "white",
                    border: "1px solid rgba(245,215,160,0.5)",
                    fontSize: 20,
                    color: "var(--color-text)",
                    fontWeight: 600,
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
            <div
              style={{
                fontSize: 24,
                color: "var(--color-primary-hover)",
                fontWeight: 700,
              }}
            >
              markethubpromo.com
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

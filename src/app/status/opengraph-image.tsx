import { ImageResponse } from "next/og";

// Per-page OG image for /status — shows branded "System Status" card.
// Useful when sharing during an incident ("here's the status page").

export const runtime = "edge";
export const alt = "MarketHub Pro — System Status";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGStatus() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #FFFCF7 0%, #F5EFE5 100%)",
          padding: 72,
          textAlign: "center",
        }}
      >
        {/* green pulse orb */}
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 30% 30%, #10B981, #047857)",
            boxShadow: "0 0 60px rgba(16,185,129,0.35), inset 0 -16px 32px rgba(0,0,0,0.2)",
            marginBottom: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 64,
            color: "white",
          }}
        >
          ✓
        </div>

        <h1
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#292524",
            margin: 0,
            letterSpacing: "-0.02em",
            marginBottom: 16,
          }}
        >
          System Status
        </h1>
        <p
          style={{
            fontSize: 26,
            color: "#78614E",
            margin: 0,
            marginBottom: 40,
          }}
        >
          Real-time health of every MarketHub Pro subsystem
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 28px",
            background: "white",
            borderRadius: 999,
            border: "1px solid rgba(245,215,160,0.5)",
            fontSize: 20,
            color: "#292524",
          }}
        >
          <span style={{ color: "#F59E0B", fontWeight: 700 }}>●</span>
          markethubpromo.com/status
        </div>
      </div>
    ),
    { ...size },
  );
}

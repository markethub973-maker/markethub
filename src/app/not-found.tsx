import Link from "next/link";
import { Compass, Home, MessageCircle } from "lucide-react";

/**
 * Custom 404 page — brand-matched, helpful CTAs.
 *
 * Renders for any unknown route in the App Router. Replaces Next.js's
 * default plain "404 Not Found" with a designed page that keeps users
 * on the platform.
 */
export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: "#FFFCF7" }}
    >
      <div className="max-w-md w-full text-center">
        <div
          className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6"
          style={{
            background:
              "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.1))",
          }}
        >
          <Compass className="w-10 h-10" style={{ color: "#D97706" }} />
        </div>

        <h1
          className="text-5xl font-bold mb-2"
          style={{ color: "#292524", fontFamily: "system-ui" }}
        >
          404
        </h1>
        <h2
          className="text-xl font-bold mb-3"
          style={{ color: "#292524" }}
        >
          We couldn&apos;t find that page
        </h2>
        <p className="text-sm mb-8" style={{ color: "#78614E" }}>
          The link might be broken, the page may have moved, or it never
          existed in the first place. Let&apos;s get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, #F59E0B, #D97706)",
              color: "#1C1814",
              boxShadow: "0 4px 12px rgba(245,158,11,0.3)",
            }}
          >
            <Home className="w-4 h-4" />
            Back to dashboard
          </Link>
          <Link
            href="/help"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all"
            style={{
              backgroundColor: "white",
              color: "#292524",
              border: "1px solid rgba(245,215,160,0.4)",
            }}
          >
            <MessageCircle className="w-4 h-4" />
            Contact support
          </Link>
        </div>

        <p className="text-xs mt-8" style={{ color: "#A8967E" }}>
          MarketHub Pro · Social Video Intelligence
        </p>
      </div>
    </div>
  );
}

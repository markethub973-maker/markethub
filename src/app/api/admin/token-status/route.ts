import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

interface TokenInfo {
  platform: string;
  label: string;
  token_prefix: string;
  saved_at: string;
  expires_at: string | null;
  expires_days: number | null;
  status: "ok" | "warning" | "expired" | "unknown" | "never_expires";
  renewal_url: string;
  renewal_guide: string;
  extra?: Record<string, string>;
}

// Meta long-lived tokens last 60 days
const META_TOKEN_DAYS = 60;

function metaExpiry(savedAt: string): { expires_at: string; expires_days: number } {
  const saved = new Date(savedAt);
  const expires = new Date(saved.getTime() + META_TOKEN_DAYS * 86400 * 1000);
  const days = Math.ceil((expires.getTime() - Date.now()) / 86400000);
  return { expires_at: expires.toISOString(), expires_days: days };
}

function statusFromDays(days: number | null): "ok" | "warning" | "expired" | "unknown" | "never_expires" {
  if (days === null) return "unknown";
  if (days < 0) return "expired";
  if (days <= 7) return "warning";
  return "ok";
}

export async function GET() {
  const supabase = createServiceClient();

  const { data: platforms } = await supabase
    .from("admin_platform_config")
    .select("platform, token, extra_data, updated_at");

  const tokens: TokenInfo[] = [];

  for (const p of platforms || []) {
    const savedAt = p.updated_at || new Date().toISOString();

    if (p.platform === "instagram") {
      const { expires_at, expires_days } = metaExpiry(savedAt);
      tokens.push({
        platform: "instagram",
        label: "Instagram Long-lived Token",
        token_prefix: p.token ? p.token.substring(0, 16) + "..." : "—",
        saved_at: savedAt,
        expires_at,
        expires_days,
        status: statusFromDays(expires_days),
        renewal_url: "https://developers.facebook.com/tools/explorer/",
        renewal_guide: "Meta Graph API Explorer → Get User Access Token → exchange for Long-lived Token",
        extra: {
          username: p.extra_data?.username || "—",
          instagram_id: p.extra_data?.instagram_id || "—",
          last_refresh: p.extra_data?.last_refresh || savedAt,
        },
      });
    }

    if (p.platform === "facebook") {
      const { expires_at, expires_days } = metaExpiry(savedAt);
      tokens.push({
        platform: "facebook",
        label: "Facebook Page Access Token",
        token_prefix: p.token ? p.token.substring(0, 16) + "..." : "—",
        saved_at: savedAt,
        expires_at,
        expires_days,
        status: statusFromDays(expires_days),
        renewal_url: "https://developers.facebook.com/tools/explorer/",
        renewal_guide: "Meta Graph API Explorer → GET /me/accounts → copy page access_token",
        extra: {
          page_name: p.extra_data?.page_name || "—",
          page_id: p.extra_data?.page_id || "—",
        },
      });
    }

    if (p.platform === "youtube") {
      tokens.push({
        platform: "youtube",
        label: "YouTube Channel ID",
        token_prefix: p.token ? p.token.substring(0, 12) + "..." : "—",
        saved_at: savedAt,
        expires_at: null,
        expires_days: null,
        status: p.token ? "never_expires" : "unknown",
        renewal_url: "https://studio.youtube.com",
        renewal_guide: "YouTube Studio → Settings → Channel → Advanced settings → Channel ID",
      });
    }
  }

  // Add static API keys with known expiry rules
  const envTokens: TokenInfo[] = [
    {
      platform: "anthropic",
      label: "Anthropic API Key",
      token_prefix: process.env.ANTHROPIC_API_KEY ? "sk-ant-api03-..." : "—",
      saved_at: "2026-03-19T00:00:00Z",
      expires_at: null,
      expires_days: null,
      status: process.env.ANTHROPIC_API_KEY ? "never_expires" : "unknown",
      renewal_url: "https://console.anthropic.com/settings/keys",
      renewal_guide: "console.anthropic.com → API Keys → Create Key",
    },
    {
      platform: "youtube_api",
      label: "YouTube Data API Key",
      token_prefix: process.env.YOUTUBE_API_KEY ? "AIzaSy..." : "—",
      saved_at: "2026-03-19T00:00:00Z",
      expires_at: null,
      expires_days: null,
      status: process.env.YOUTUBE_API_KEY ? "never_expires" : "unknown",
      renewal_url: "https://console.cloud.google.com/apis/credentials",
      renewal_guide: "Google Cloud Console → APIs & Services → Credentials",
    },
    {
      platform: "rapidapi",
      label: "RapidAPI Key (TikTok + Social)",
      token_prefix: process.env.RAPIDAPI_KEY ? process.env.RAPIDAPI_KEY.substring(0, 8) + "..." : "—",
      saved_at: "2026-03-19T00:00:00Z",
      expires_at: null,
      expires_days: null,
      status: process.env.RAPIDAPI_KEY ? "never_expires" : "unknown",
      renewal_url: "https://rapidapi.com/developer/dashboard",
      renewal_guide: "RapidAPI Dashboard → Apps → Add New App → Copy API Key",
    },
    {
      platform: "resend",
      label: "Resend Email API Key",
      token_prefix: process.env.RESEND_API_KEY ? "re_..." : "—",
      saved_at: "2026-03-19T00:00:00Z",
      expires_at: null,
      expires_days: null,
      status: process.env.RESEND_API_KEY ? "never_expires" : "unknown",
      renewal_url: "https://resend.com/api-keys",
      renewal_guide: "resend.com → API Keys → Create API Key",
    },
    {
      platform: "google_oauth",
      label: "Google OAuth (YouTube Analytics)",
      token_prefix: process.env.GOOGLE_CLIENT_ID ? "226992..." : "—",
      saved_at: "2026-04-01T00:00:00Z",
      expires_at: null,
      expires_days: null,
      status: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? "never_expires" : "unknown",
      renewal_url: "https://console.cloud.google.com/apis/credentials",
      renewal_guide: "Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client",
    },
    {
      platform: "stripe",
      label: "Stripe Secret Key",
      token_prefix: process.env.STRIPE_SECRET_KEY ? "sk_test_..." : "—",
      saved_at: "2026-03-19T00:00:00Z",
      expires_at: null,
      expires_days: null,
      status: process.env.STRIPE_SECRET_KEY ? "never_expires" : "unknown",
      renewal_url: "https://dashboard.stripe.com/apikeys",
      renewal_guide: "Stripe Dashboard → Developers → API Keys → Reveal/Rotate",
    },
  ];

  const all = [...tokens, ...envTokens].sort((a, b) => {
    const order = { expired: 0, warning: 1, unknown: 2, ok: 3, never_expires: 4 };
    return (order[a.status] ?? 5) - (order[b.status] ?? 5);
  });

  const summary = {
    total: all.length,
    expired: all.filter(t => t.status === "expired").length,
    warning: all.filter(t => t.status === "warning").length,
    ok: all.filter(t => t.status === "ok").length,
    never_expires: all.filter(t => t.status === "never_expires").length,
  };

  return NextResponse.json({ tokens: all, summary });
}
